"""
Proxima MCP接続テスト - Perplexity経由でリアルタイム検索
"""
import json, subprocess, sys

def call_mcp_tool(tool_name, params):
    """ProximaのMCPサーバーにツールを呼び出す"""
    mcp_path = r"C:\Users\nao\AppData\Local\Programs\Proxima\resources\app.asar.unpacked\src\mcp-server-v3.js"
    
    # MCPプロトコル: initialize -> tools/call
    messages = [
        {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "test", "version": "1.0"}
        }},
        {"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {
            "name": tool_name,
            "arguments": params
        }}
    ]
    
    input_data = "\n".join(json.dumps(m) for m in messages) + "\n"
    
    result = subprocess.run(
        ["node", mcp_path],
        input=input_data,
        capture_output=True,
        text=True,
        timeout=30
    )
    
    return result.stdout, result.stderr

if __name__ == "__main__":
    print("Proxima MCPツール接続テスト\n")
    
    # まず利用可能なツール一覧を取得
    msg = json.dumps({
        "jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "test", "version": "1.0"}
        }
    }) + "\n" + json.dumps({
        "jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}
    }) + "\n"
    
    mcp_path = r"C:\Users\nao\AppData\Local\Programs\Proxima\resources\app.asar.unpacked\src\mcp-server-v3.js"
    result = subprocess.run(["node", mcp_path], input=msg, capture_output=True, text=True, timeout=10)
    
    for line in result.stdout.splitlines():
        try:
            data = json.loads(line)
            if "result" in data and "tools" in data.get("result", {}):
                tools = data["result"]["tools"]
                print(f"✅ 利用可能なMCPツール数: {len(tools)}")
                perplexity_tools = [t["name"] for t in tools if "perplexity" in t["name"].lower() or "search" in t["name"].lower()]
                print(f"🔍 Perplexity/検索系ツール: {perplexity_tools}")
        except:
            pass
    
    if result.stderr:
        for line in result.stderr.splitlines():
            if "Error" in line or "Warning" in line:
                print(f"⚠️  {line}")
