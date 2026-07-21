from fastapi import FastAPI, UploadFile, File
from typing import Optional

app = FastAPI(title="Agente de Integra\u00E7\u00E3o", version="0.1.0")

@app.get("/health")
def health():
    return {"status": "ok", "agent": "integracao"}

@app.post("/processar/documento")
async def processar_documento(file: UploadFile = File(...), tipo: Optional[str] = None):
    content = await file.read()
    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "size_bytes": len(content),
        "message": "Processamento iniciado (OCR/extra\u00E7\u00E3o ser\u00E1 implementado)",
    }
