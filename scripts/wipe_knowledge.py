import asyncio
import os
import sys
from pathlib import Path

# Add the project root to sys.path to allow importing app
sys.path.append(str(Path(__file__).parent.parent))

from app.core.config import settings
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def wipe_knowledge():
    """Nuclear option to clear the knowledge base table directly via SQL."""
    print("🚀 Iniciando limpieza forzada de la base de conocimientos...")
    
    # Si estamos fuera de Docker (en Mac), 'db' no resuelve, usamos 'localhost'
    db_host = settings.POSTGRES_HOST
    if db_host == "db":
        db_host = "localhost"
        print("ℹ️  Detectado entorno local (Mac), cambiando host 'db' por 'localhost'...")
    
    async_connection_url = (
        f"postgresql+psycopg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
        f"@{db_host}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
    )
    
    engine = create_async_engine(async_connection_url)
    
    try:
        async with engine.begin() as conn:
            # Primero intentamos vaciar la tabla de embeddings
            print("🧹 Vaciando tabla langchain_pg_embedding...")
            await conn.execute(text("TRUNCATE TABLE langchain_pg_embedding CASCADE;"))
            
            # También vaciamos la de colecciones para empezar de cero
            print("🧹 Vaciando tabla langchain_pg_collection...")
            await conn.execute(text("TRUNCATE TABLE langchain_pg_collection CASCADE;"))
            
        print("✅ Base de datos de vectores limpia. Ahora puedes re-subir tus documentos.")
    except Exception as e:
        print(f"❌ Error durante la limpieza: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(wipe_knowledge())
