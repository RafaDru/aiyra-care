from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="Agente Farmac\u00EAutico", version="0.1.0")

class Medicamento(BaseModel):
    nome_generico: str
    nome_comercial: Optional[str] = None
    dosagem: str
    via: str

class InteracaoRequest(BaseModel):
    medicamentos: List[Medicamento]

@app.get("/health")
def health():
    return {"status": "ok", "agent": "farmaceutico"}

@app.post("/interacoes/checar")
def checar_interacoes(req: InteracaoRequest):
    return {
        "medicamentos": [m.nome_generico for m in req.medicamentos],
        "possiveis_interacoes": [],
        "mensagem": "Verifica\u00E7\u00E3o de intera\u00E7\u00F5es ser\u00E1 implementada com base de dados",
    }
