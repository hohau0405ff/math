import os, shutil, sqlite3, json, sys, re, urllib.request
sys.stdout.reconfigure(encoding='utf-8')

src_dir = r"D:\share_tailieu"
dst_dir = r"D:\server_math\share_tailieu"

print(f"Syncing from {src_dir} to {dst_dir}...")

# 1. Copy updated source code files
files_to_sync = ['index.html', 'app.js', 'style.css', 'main.py']
for fname in files_to_sync:
    src_file = os.path.join(src_dir, fname)
    dst_file = os.path.join(dst_dir, fname)
    if os.path.exists(src_file):
        shutil.copy2(src_file, dst_file)
        print(f"  Copied {fname} to {dst_dir}")

# 2. Clean edushare.db in BOTH directories
for db_path in [os.path.join(src_dir, 'edushare.db'), os.path.join(dst_dir, 'edushare.db')]:
    if not os.path.exists(db_path):
        continue
    print(f"\nCleaning database: {db_path}...")
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    # Users
    c.execute("DELETE FROM users WHERE email != 'hotranminhky0405@gmail.com'")
    # Rooms
    c.execute("DELETE FROM rooms WHERE id != 'room_community'")
    comm_members = json.dumps([{"email": "hotranminhky0405@gmail.com", "role": "leader"}])
    c.execute("""
        UPDATE rooms 
        SET members_json = ?, pending_json = '[]', pinned_message_id = NULL, pinned_message_ids = '[]'
        WHERE id = 'room_community'
    """, (comm_members,))
    # Messages
    c.execute("DELETE FROM messages WHERE room_id != 'room_community' OR sender_email != 'hotranminhky0405@gmail.com'")
    # Documents
    c.execute("DELETE FROM documents WHERE uploader_email != 'hotranminhky0405@gmail.com'")
    # Posts
    c.execute("DELETE FROM posts WHERE author_email != 'hotranminhky0405@gmail.com'")
    c.execute("UPDATE posts SET likes_json = '[]', comments_json = '[]'")
    # Friendships
    c.execute("DELETE FROM friendships")

    conn.commit()
    conn.close()
    print(f"  Cleaned {db_path} successfully.")

print("\nSync and database cleaning complete!")
