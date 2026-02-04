from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.request import urlopen
from urllib.error import HTTPError
import json

class ProxyHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # 处理代理请求
            if self.path.startswith('/proxy/'):
                # 获取真实URL
                target_url = self.path[7:]  # 移除 '/proxy/'
                
                # 添加https前缀（如果没有）
                if not target_url.startswith('http'):
                    target_url = 'https://' + target_url
                
                print(f"正在代理请求: {target_url}")
                
                # 请求目标资源
                response = urlopen(target_url)
                content = response.read()
                
                # 设置响应头
                self.send_response(200)
                self.send_header('Content-Type', response.headers['Content-Type'])
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET')
                self.end_headers()
                
                # 返回内容
                self.wfile.write(content)
            else:
                # 其他请求正常处理
                self.send_response(404)
                self.end_headers()
                
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(str(e).encode())
    
    def do_OPTIONS(self):
        # 处理预检请求
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == '__main__':
    server = HTTPServer(('localhost', 8888), ProxyHandler)
    print('代理服务器运行在 http://localhost:8888')
    server.serve_forever()