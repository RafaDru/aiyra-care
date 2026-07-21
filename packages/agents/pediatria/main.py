from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Agente de Pediatria", version="0.1.0")

CRIANCAS = {
    "luis": {"nome": "Lu\u00EDs Drummond Freitas Reis", "nascimento": "23/01/2020", "peso": 20},
    "bruno": {"nome": "Bruno Drummond Freitas Reis", "nascimento": "26/10/2022", "peso": 14},
}

@app.get("/health")
def health():
    return {"status": "ok", "agent": "pediatria"}

@app.get("/criancas")
def listar_criancas():
    return CRIANCAS

class ConsultaRequest(BaseModel):
    crianca_id: str
    contexto: str

@app.post("/resumo-pre-consulta")
def resumo_pre_consulta(req: ConsultaRequest):
    crianca = CRIANCAS.get(req.crianca_id)
    if not crianca:
        return {"error": "Crian\u00E7a n\u00E3o encontrada"}
    return {
        "crianca": crianca,
        "resumo": f"Resumo gerado para {crianca['nome']} com base em: {req.contexto}",
    }
