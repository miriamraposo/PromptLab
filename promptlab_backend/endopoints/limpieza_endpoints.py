# endpoints/limpieza_endpoints.py
from flask import request, jsonify
import pandas as pd
from services.asistente_de_limpieza_orquestador import (
    get_preliminary_analysis,
    get_column_details,
    apply_cleaning_action
)

def register_limpieza_endpoints(app):

    @app.route("/limpieza/preanalisis", methods=["POST"])
    def preanalisis():
        try:
            df_data = request.json.get("data")
            df = pd.DataFrame(df_data)
            result = get_preliminary_analysis(df)
            return jsonify(result)
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    @app.route("/limpieza/columna", methods=["POST"])
    def columna():
        try:
            payload = request.json
            df = pd.DataFrame(payload["data"])
            column_name = payload["column_name"]
            result = get_column_details(df, column_name)
            return jsonify(result)
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    @app.route("/limpieza/accion", methods=["POST"])
    def accion():
        try:
            payload = request.json
            df = pd.DataFrame(payload["data"])
            action = payload["action"]
            params = payload.get("params", {})
            result = apply_cleaning_action(df, action, params)
            return jsonify(result)
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
