import os
import re
import io
import uuid
import asyncio
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional, Annotated, Any

from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from fastapi.responses import Response
from fastapi.concurrency import run_in_threadpool
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict

from emergentintegrations.llm.chat import LlmChat, UserMessage

import prompts
import export_utils
import storage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]
EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]
MODEL_PROVIDER = "anthropic"
MODEL_NAME = "claude-sonnet-5-5"

app = FastAPI(title="PJOK Super-App API")
api_router = APIRouter(prefix="/api")

# Emergent LLM key allows 1 concurrent request; serialize generation calls.
_llm_lock = asyncio.Semaphore(1)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Mongo helpers
# ---------------------------------------------------------------------------
def _validate_object_id(v: Any) -> str:
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, str):
        return v
    raise ValueError("Invalid ObjectId")


PyObjectId = Annotated[str, BeforeValidator(_validate_object_id)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    @classmethod
    def from_mongo(cls, doc: dict):
        if not doc:
            return None
        return cls(**doc)

    def to_mongo(self) -> dict:
        data = self.model_dump(by_alias=True, exclude_none=True)
        data.pop("_id", None)
        return data


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class Profile(BaseModel):
    nama_guru: str = ""
    nip_guru: str = ""
    nama_sekolah: str = ""
    npsn: str = ""
    dinas: str = ""
    alamat_sekolah: str = ""
    tahun_ajaran: str = ""


class Student(BaseModel):
    nama: str
    no_absen: Optional[str] = ""


class ClassCreate(BaseModel):
    nama_kelas: str
    jenjang: str = ""
    fase: str = ""
    tahun_ajaran: str = ""
    students: List[Student] = []


class ClassDoc(BaseDocument):
    nama_kelas: str
    jenjang: str = ""
    fase: str = ""
    tahun_ajaran: str = ""
    students: List[Student] = []
    created_at: str = Field(default_factory=now_iso)
    deleted_at: Optional[str] = None


class AttendanceRecord(BaseModel):
    nama: str
    no_absen: Optional[str] = ""
    status: Optional[str] = None  # H/S/I/A/K3 or None
    note: Optional[str] = ""


class AttendanceCreate(BaseModel):
    tanggal: str
    materi: str = ""
    records: List[AttendanceRecord] = []


class GenModulAjar(BaseModel):
    jenjang: str = ""
    fase: str = ""
    materi: str = ""
    durasi: str = ""
    semester: str = ""


class GenSoal(BaseModel):
    jenjang: str = ""
    fase: str = ""
    topik: str = ""
    jumlah: str = ""
    level: str = ""
    bentuk: str = ""


class GenRubrik(BaseModel):
    jenjang: str = ""
    cabang: str = ""


class GenKktp(BaseModel):
    jenjang: str = ""
    fase: str = ""
    cp: str = ""


class ArchiveCreate(BaseModel):
    type: str
    title: str
    markdown: str
    meta: dict = {}


class JournalCreate(BaseModel):
    tanggal: str
    nama_kelas: str = ""
    materi: str = ""
    kegiatan: str = ""
    catatan: str = ""


# ---------------------------------------------------------------------------
# LLM
# ---------------------------------------------------------------------------
async def generate_markdown(user_prompt: str, session_id: str) -> str:
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=prompts.BASE_SYSTEM,
    ).with_model(MODEL_PROVIDER, MODEL_NAME).with_params(max_tokens=8000)
    async with _llm_lock:
        try:
            resp = await chat.send_message(UserMessage(text=user_prompt))
        except Exception as e:
            logger.error("LLM error: %s", e)
            raise HTTPException(503, "Layanan AI sedang sibuk, coba lagi sebentar lagi.")
    return resp if isinstance(resp, str) else str(resp)


def oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception:
        raise HTTPException(400, "ID tidak valid")


async def get_profile_doc() -> dict:
    doc = await db.profile.find_one({"_id": "singleton"})
    return doc or {}


def build_kop_meta(profile: dict, kelas_fase: str, materi: str, semester: str) -> dict:
    return {
        "show_kop": True,
        "logo": bool(profile.get("logo_path")),
        "dinas": profile.get("dinas", ""),
        "nama_sekolah": profile.get("nama_sekolah", ""),
        "alamat_sekolah": profile.get("alamat_sekolah", ""),
        "npsn": profile.get("npsn", ""),
        "nama_guru": profile.get("nama_guru", ""),
        "tahun_ajaran": profile.get("tahun_ajaran", ""),
        "kelas_fase": kelas_fase or "-",
        "materi": materi or "-",
        "semester": semester or "-",
    }


async def save_archive(atype: str, title: str, markdown: str, meta: dict) -> dict:
    doc = {
        "type": atype,
        "title": title,
        "markdown": markdown,
        "meta": meta,
        "created_at": now_iso(),
        "deleted_at": None,
    }
    res = await db.archives.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    return doc


# ---------------------------------------------------------------------------
# Routes - health & profile
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "PJOK Super-App API", "model": MODEL_NAME}


@api_router.get("/profile")
async def get_profile():
    doc = await get_profile_doc()
    data = {k: doc.get(k, "") for k in Profile.model_fields}
    data["has_logo"] = bool(doc.get("logo_path"))
    return data


@api_router.put("/profile", response_model=Profile)
async def update_profile(profile: Profile):
    await db.profile.update_one(
        {"_id": "singleton"},
        {"$set": {**profile.model_dump(), "updated_at": now_iso()}},
        upsert=True,
    )
    return profile


@api_router.post("/profile/logo")
async def upload_logo(file: UploadFile = File(...)):
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(400, "Ukuran logo maksimal 5MB")
    ext = (file.filename or "logo.png").rsplit(".", 1)[-1].lower()
    if ext not in ("png", "jpg", "jpeg", "webp"):
        ext = "png"
    path = f"{storage.APP_NAME}/uploads/profile/logo-{uuid.uuid4().hex}.{ext}"
    ctype = file.content_type or "image/png"
    try:
        await run_in_threadpool(storage.put_object, path, data, ctype)
    except Exception as e:
        logger.error("logo upload failed: %s", e)
        raise HTTPException(502, "Gagal mengunggah logo")
    await db.profile.update_one(
        {"_id": "singleton"},
        {"$set": {"logo_path": path, "logo_ctype": ctype, "updated_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True}


@api_router.get("/profile/logo")
async def get_logo():
    doc = await get_profile_doc()
    path = doc.get("logo_path")
    if not path:
        raise HTTPException(404, "Logo belum diatur")
    try:
        content, ctype = await run_in_threadpool(storage.get_object, path)
    except Exception:
        raise HTTPException(404, "Logo tidak ditemukan")
    return Response(content=content, media_type=ctype, headers={"Cache-Control": "no-cache"})


@api_router.delete("/profile/logo")
async def delete_logo():
    await db.profile.update_one({"_id": "singleton"}, {"$unset": {"logo_path": "", "logo_ctype": ""}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Routes - teaching journal (Modul 7)
# ---------------------------------------------------------------------------
@api_router.post("/journals")
async def create_journal(body: JournalCreate):
    doc = {**body.model_dump(), "created_at": now_iso(), "deleted_at": None}
    res = await db.journals.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    return doc


@api_router.get("/journals")
async def list_journals():
    docs = await db.journals.find({"deleted_at": None}).sort("tanggal", -1).to_list(500)
    return [_serialize(d) for d in docs]


@api_router.put("/journals/{journal_id}")
async def update_journal(journal_id: str, body: JournalCreate):
    await db.journals.update_one({"_id": oid(journal_id)}, {"$set": {**body.model_dump(), "updated_at": now_iso()}})
    doc = await db.journals.find_one({"_id": oid(journal_id)})
    return _serialize(doc)


@api_router.delete("/journals/{journal_id}")
async def delete_journal(journal_id: str):
    await db.journals.update_one({"_id": oid(journal_id)}, {"$set": {"deleted_at": now_iso()}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Routes - generation
# ---------------------------------------------------------------------------
@api_router.post("/generate/modul-ajar")
async def gen_modul_ajar(body: GenModulAjar):
    profile = await get_profile_doc()
    prompt = prompts.modul_ajar_prompt(body.jenjang, body.fase, body.materi, body.durasi, body.semester)
    md = await generate_markdown(prompt, "modul-ajar")
    materi = body.materi or "Modul Ajar PJOK"
    meta = build_kop_meta(profile, body.fase or body.jenjang, materi, body.semester)
    title = f"Modul Ajar: {materi}"
    return await save_archive("modul_ajar", title, md, meta)


@api_router.post("/generate/soal")
async def gen_soal(body: GenSoal):
    profile = await get_profile_doc()
    prompt = prompts.soal_prompt(body.jenjang, body.fase, body.topik, body.jumlah, body.level, body.bentuk)
    md = await generate_markdown(prompt, "soal")
    topik = body.topik or "Soal PJOK"
    meta = build_kop_meta(profile, body.fase or body.jenjang, topik, "")
    meta["show_identitas_siswa"] = True
    title = f"Naskah Soal: {topik}"
    return await save_archive("soal", title, md, meta)


@api_router.post("/generate/rubrik")
async def gen_rubrik(body: GenRubrik):
    prompt = prompts.rubrik_prompt(body.jenjang, body.cabang)
    md = await generate_markdown(prompt, "rubrik")
    cabang = body.cabang or "Rubrik Penilaian"
    title = f"Rubrik Penilaian: {cabang}"
    return await save_archive("rubrik", title, md, {"show_kop": False})


@api_router.post("/generate/kktp")
async def gen_kktp(body: GenKktp):
    prompt = prompts.kktp_prompt(body.jenjang, body.fase, body.cp)
    md = await generate_markdown(prompt, "kktp")
    title = f"Lingkup Materi & KKTP ({body.fase or 'Fase D'})"
    return await save_archive("kktp", title, md, {"show_kop": False})


# ---------------------------------------------------------------------------
# Routes - classes (rombel)
# ---------------------------------------------------------------------------
@api_router.post("/classes")
async def create_class(body: ClassCreate):
    doc = ClassDoc(**body.model_dump())
    res = await db.classes.insert_one(doc.to_mongo())
    saved = await db.classes.find_one({"_id": res.inserted_id})
    return _serialize(saved)


@api_router.get("/classes")
async def list_classes():
    docs = await db.classes.find({"deleted_at": None}).sort("created_at", -1).to_list(500)
    return [_serialize(d) for d in docs]


@api_router.get("/classes/{class_id}")
async def get_class(class_id: str):
    doc = await db.classes.find_one({"_id": oid(class_id), "deleted_at": None})
    if not doc:
        raise HTTPException(404, "Kelas tidak ditemukan")
    return _serialize(doc)


@api_router.put("/classes/{class_id}")
async def update_class(class_id: str, body: ClassCreate):
    await db.classes.update_one(
        {"_id": oid(class_id)},
        {"$set": {**body.model_dump(), "updated_at": now_iso()}},
    )
    doc = await db.classes.find_one({"_id": oid(class_id)})
    return _serialize(doc)


@api_router.delete("/classes/{class_id}")
async def delete_class(class_id: str):
    await db.classes.update_one({"_id": oid(class_id)}, {"$set": {"deleted_at": now_iso()}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Routes - attendance (Modul 6)
# ---------------------------------------------------------------------------
WARNING_TEXT = "DIBERIKAN TUGAS AMATAN TEORI (TIDAK BOLEH IKUT PRAKTIK FISIK BERAT)"


def resolve_attendance(records: List[AttendanceRecord]):
    resolved = []
    warnings = []
    for rec in records:
        status = (rec.status or "").upper().strip()
        note = rec.note or ""
        if status == "":
            status = "H"
            note = (note + " (Perlu Konfirmasi Guru)").strip()
        if status in ("S", "K3"):
            warnings.append(f"{rec.nama}: {WARNING_TEXT}")
            note = (note + f" | {WARNING_TEXT}").strip(" |")
        resolved.append({
            "nama": rec.nama,
            "no_absen": rec.no_absen or "",
            "status": status,
            "note": note,
        })
    return resolved, warnings


@api_router.post("/classes/{class_id}/attendance")
async def save_attendance(class_id: str, body: AttendanceCreate):
    cls = await db.classes.find_one({"_id": oid(class_id), "deleted_at": None})
    if not cls:
        raise HTTPException(404, "Kelas tidak ditemukan")
    resolved, warnings = resolve_attendance(body.records)
    summary = {}
    for r in resolved:
        summary[r["status"]] = summary.get(r["status"], 0) + 1
    doc = {
        "class_id": class_id,
        "class_name": cls.get("nama_kelas", ""),
        "tanggal": body.tanggal,
        "materi": body.materi,
        "records": resolved,
        "warnings": warnings,
        "summary": summary,
        "created_at": now_iso(),
        "deleted_at": None,
    }
    res = await db.attendance.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    return doc


@api_router.get("/classes/{class_id}/attendance")
async def list_attendance(class_id: str):
    docs = await db.attendance.find({"class_id": class_id, "deleted_at": None}).sort("created_at", -1).to_list(500)
    return [_serialize(d) for d in docs]


@api_router.get("/classes/{class_id}/recap")
async def attendance_recap(class_id: str):
    return await _compute_recap(class_id)


async def _compute_recap(class_id: str) -> dict:
    cls = await db.classes.find_one({"_id": oid(class_id), "deleted_at": None})
    if not cls:
        raise HTTPException(404, "Kelas tidak ditemukan")
    sessions = await db.attendance.find({"class_id": class_id, "deleted_at": None}).to_list(1000)
    total = len(sessions)
    students = cls.get("students", [])

    recap = []
    codes = ["H", "S", "I", "A", "K3"]
    for st in students:
        counts = {c: 0 for c in codes}
        for sess in sessions:
            rec = next((r for r in sess.get("records", []) if r.get("nama") == st.get("nama")), None)
            if rec and rec.get("status") in counts:
                counts[rec["status"]] += 1
        hadir = counts["H"]
        pct = round(hadir / total * 100) if total else 0
        recap.append({
            "nama": st.get("nama", ""),
            "no_absen": st.get("no_absen", ""),
            "counts": counts,
            "hadir": hadir,
            "total": total,
            "hadir_pct": pct,
        })
    return {"total_sessions": total, "class_name": cls.get("nama_kelas", ""), "students": recap}


@api_router.get("/classes/{class_id}/recap/export")
async def export_recap(class_id: str):
    recap = await _compute_recap(class_id)
    prof = await get_profile_doc()
    meta = {
        "show_kop": bool(prof.get("nama_sekolah") or prof.get("dinas")),
        "dinas": prof.get("dinas", ""),
        "nama_sekolah": prof.get("nama_sekolah", ""),
        "alamat_sekolah": prof.get("alamat_sekolah", ""),
        "npsn": prof.get("npsn", ""),
    }
    logo_bytes = None
    if prof.get("logo_path"):
        try:
            logo_bytes, _ = await run_in_threadpool(storage.get_object, prof["logo_path"])
        except Exception:
            logo_bytes = None
    data = await run_in_threadpool(export_utils.recap_to_xlsx, recap, meta, logo_bytes)
    safe = re.sub(r"[^A-Za-z0-9]+", "_", recap.get("class_name") or "rekap")[:50] or "rekap"
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="Rekap_{safe}.xlsx"'},
    )


# ---------------------------------------------------------------------------
# Routes - archives
# ---------------------------------------------------------------------------
@api_router.post("/archives")
async def create_archive(body: ArchiveCreate):
    return await save_archive(body.type, body.title, body.markdown, body.meta)


@api_router.get("/archives")
async def list_archives(type: Optional[str] = None):
    q = {"deleted_at": None}
    if type:
        q["type"] = type
    docs = await db.archives.find(q).sort("created_at", -1).to_list(500)
    return [_serialize(d) for d in docs]


@api_router.get("/archives/{archive_id}")
async def get_archive(archive_id: str):
    doc = await db.archives.find_one({"_id": oid(archive_id), "deleted_at": None})
    if not doc:
        raise HTTPException(404, "Arsip tidak ditemukan")
    return _serialize(doc)


@api_router.delete("/archives/{archive_id}")
async def delete_archive(archive_id: str):
    await db.archives.update_one({"_id": oid(archive_id)}, {"$set": {"deleted_at": now_iso()}})
    return {"ok": True}


@api_router.get("/archives/{archive_id}/export")
async def export_archive(archive_id: str, format: str = "pdf"):
    doc = await db.archives.find_one({"_id": oid(archive_id), "deleted_at": None})
    if not doc:
        raise HTTPException(404, "Arsip tidak ditemukan")
    title = doc.get("title", "Dokumen")
    md = doc.get("markdown", "")
    meta = doc.get("meta", {})
    safe = re.sub(r"[^A-Za-z0-9]+", "_", title)[:50] or "dokumen"

    logo_bytes = None
    if meta.get("show_kop") and meta.get("logo"):
        prof = await get_profile_doc()
        lp = prof.get("logo_path")
        if lp:
            try:
                logo_bytes, _ = await run_in_threadpool(storage.get_object, lp)
            except Exception:
                logo_bytes = None

    if format == "docx":
        data = export_utils.to_docx(title, md, meta, logo_bytes)
        media = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ext = "docx"
    elif format == "xlsx":
        data = export_utils.to_xlsx(title, md, meta, logo_bytes)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ext = "xlsx"
    else:
        data = export_utils.to_pdf(title, md, meta, logo_bytes)
        media = "application/pdf"
        ext = "pdf"

    return Response(
        content=data,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{safe}.{ext}"'},
    )


def _serialize(doc: dict) -> dict:
    if not doc:
        return {}
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return doc


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_init_storage():
    try:
        await run_in_threadpool(storage.init_storage)
        logger.info("Object storage initialized")
    except Exception as e:
        logger.warning("Object storage init failed (will retry on demand): %s", e)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
