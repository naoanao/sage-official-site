import sys
import json
import logging
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend.modules.sage_master_agent import SageMasterAgent

# Configure logging to file (since stdout is used for MCP)
logging.basicConfig(filename='sage_mcp.log', level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SageMCPServer:
    def __init__(self):
        self.sage = SageMasterAgent()
        logger.info("Sage MCP Server Initialized")

    def run(self):
        """
        Main loop for processing JSON-RPC messages from stdin.
        """
        while True:
            try:
                line = sys.stdin.readline()
                if not line:
                    break
                
                request = json.loads(line)
                logger.info(f"Received request: {request}")
                
                response = self.handle_request(request)
                
                if response:
                    sys.stdout.write(json.dumps(response) + "\n")
                    sys.stdout.flush()
                    logger.info(f"Sent response: {response}")
                    
            except json.JSONDecodeError:
                logger.error("Invalid JSON received")
            except Exception as e:
                logger.error(f"Error in main loop: {e}")

    def handle_request(self, request):
        msg_type = request.get("method")
        msg_id = request.get("id")
        
        # 1. Initialize
        if msg_type == "initialize":
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {
                    "protocolVersion": "0.1.0",
                    "capabilities": {
                        "tools": {}
                    },
                    "serverInfo": {
                        "name": "sage-mcp-server",
                        "version": "1.0.0"
                    }
                }
            }
        
        # 2. List Tools
        elif msg_type == "tools/list":
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {
                    "tools": [
                        {
                            "name": "ask_sage",
                            "description": "Ask Sage (The Wise AI Agent) for advice, code, or analysis.",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "query": {
                                        "type": "string",
                                        "description": "The question or task for Sage."
                                    }
                                },
                                "required": ["query"]
                            }
                        }
                    ]
                }
            }
        
        # 3. Call Tool
        elif msg_type == "tools/call":
            params = request.get("params", {})
            tool_name = params.get("name")
            args = params.get("arguments", {})
            
            if tool_name == "ask_sage":
                query = args.get("query")
                try:
                    # Call Sage Master Agent
                    result = self.sage.run(query)
                    final_response = result.get("final_response", "No response generated.")
                    
                    return {
                        "jsonrpc": "2.0",
                        "id": msg_id,
                        "result": {
                            "content": [
                                {
                                    "type": "text",
                                    "text": final_response
                                }
                            ]
                        }
                    }
                except Exception as e:
                    return {
                        "jsonrpc": "2.0",
                        "id": msg_id,
                        "error": {
                            "code": -32000,
                            "message": str(e)
                        }
                    }
            else:
                return {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "error": {
                        "code": -32601,
                        "message": "Method not found"
                    }
                }
        
        return None

if __name__ == "__main__":
    server = SageMCPServer()
    server.run()
