import logging

logger = logging.getLogger(__name__)

class BigQueryAgent:
    """
    Agent for generating BigQuery SQL queries.
    Acting as a Data Copilot.
    """
    def __init__(self):
        self.known_tables = [
            "analytics.events",
            "users.profiles",
            "sales.orders",
            "marketing.campaigns"
        ]

    def generate_sql(self, request: str) -> dict:
        """
        Generates standard BigQuery SQL based on natural language request.
        Uses heuristic templates for demonstration.
        """
        try:
            sql = ""
            explanation = ""
            
            req_lower = request.lower()

            if "user" in req_lower and "count" in req_lower:
                sql = "SELECT COUNT(user_id) as total_users FROM `users.profiles`"
                explanation = "Counts all unique user IDs from the profiles table."
            
            elif "sales" in req_lower:
                if "average" in req_lower or "avg" in req_lower:
                     sql = "SELECT country, AVG(amount) as avg_order_value FROM `sales.orders` GROUP BY country ORDER BY avg_order_value DESC"
                     explanation = "Calculates average order value per country, sorted descending."
                else:
                    sql = "SELECT * FROM `sales.orders` LIMIT 100"
                    explanation = "Selects top 100 recent orders."

            elif "campaign" in req_lower:
                 sql = "SELECT campaign_name, SUM(clicks) as total_clicks FROM `marketing.campaigns` GROUP BY campaign_name"
                 explanation = "Aggregates clicks by campaign."
            
            else:
                # Default fallback
                sql = "SELECT * FROM `analytics.events` WHERE event_timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY) LIMIT 10"
                explanation = "Generic query: Recent analytics events from last 7 days."

            return {
                "status": "success",
                "sql": sql,
                "explanation": explanation
            }
            
        except Exception as e:
            logger.error(f"SQL Generation failed: {e}")
            return {"status": "error", "message": str(e)}

    def explain_query(self, sql: str) -> dict:
        """
        Explains a given SQL query.
        """
        return {
            "status": "success",
            "explanation": f"Analyze this query: {sql}"
        }
