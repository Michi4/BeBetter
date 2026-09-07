# Minimal fake SMTP catcher for mail-flow tests. Listens on 1025, captures DATA.
import socket, threading

received = []
srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
srv.bind(('0.0.0.0', 1025))
srv.listen(5)
print('fake-smtp listening on 1025', flush=True)

def handle(conn):
    try:
        f = conn.makefile('rw', newline='\r\n')
        f.write('220 fake-smtp ESMTP\r\n'); f.flush()
        data_mode = False
        buf = []
        for line in f:
            cmd = line.strip()
            if data_mode:
                if cmd == '.':
                    received.append('\n'.join(buf))
                    print('=== MAIL RECEIVED ===', flush=True)
                    print('\n'.join(buf), flush=True)
                    print('=== END MAIL ===', flush=True)
                    buf = []
                    data_mode = False
                    f.write('250 ok\r\n'); f.flush()
                else:
                    buf.append(cmd)
                continue
            upper = cmd.upper()
            if upper.startswith('EHLO') or upper.startswith('HELO'):
                f.write('250 fake\r\n'); f.flush()
            elif upper.startswith('MAIL FROM') or upper.startswith('RCPT TO'):
                f.write('250 ok\r\n'); f.flush()
            elif upper == 'DATA':
                f.write('354 end with .\r\n'); f.flush()
                data_mode = True
            elif upper == 'QUIT':
                f.write('221 bye\r\n'); f.flush()
                break
            elif upper == 'RSET':
                f.write('250 ok\r\n'); f.flush()
            else:
                f.write('250 ok\r\n'); f.flush()
    except Exception as e:
        print('conn err', e, flush=True)
    finally:
        conn.close()

while True:
    c, _ = srv.accept()
    threading.Thread(target=handle, args=(c,), daemon=True).start()
