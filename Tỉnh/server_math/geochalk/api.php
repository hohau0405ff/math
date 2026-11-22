<?php
/**
 * ==============================================================================
 * GEOCHALK BACKEND API - PHP + SQLITE + PROXY LOGIN EDUSHARE
 * ==============================================================================
 * Máy chủ Backend viết bằng PHP dành riêng cho Hình Học (GeoChalk 3D/2D/CAS):
 * 1. Cơ sở dữ liệu: SQLite (geochalk.db) lưu trữ các dự án vẽ trực tuyến
 * 2. Xác thực tài khoản: Kết nối API Login sang EduShare (share_tailieu)
 * 3. Chuẩn hóa RESTful: Hỗ trợ đầy đủ CORS, JSON request/response
 * 4. Độc lập hoàn toàn: Không can thiệp hay sửa đổi mã nguồn của EduShare
 * ==============================================================================
 */

// Thiết lập múi giờ và cấu hình lỗi
date_default_timezone_set('Asia/Ho_Chi_Minh');
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
ini_set('display_errors', '0');

// ==============================================================================
// 1. CẤU HÌNH HEADERS & CORS (HỖ TRỢ CROSS-ORIGIN CHO WEB TĨNH)
// ==============================================================================
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-EduShare-Auth-Url');

// Xử lý Preflight Request (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ==============================================================================
// 2. NẾU CHẠY BẰNG PHP BUILT-IN SERVER: PHỤC VỤ STATIC FILE NẾU TỒN TẠI
// ==============================================================================
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$parsedUrl = parse_url($requestUri);
$reqPath = $parsedUrl['path'] ?? '/';

// Định tuyến trang chủ hoặc đường dẫn chia sẻ trực tiếp sang geochalk.html
// Hỗ trợ trỏ thẳng vào bảng vẽ cho: /board/share/:shareId hoặc /share/:shareId (không về Home)
if (
    $reqPath === '/' || $reqPath === '/index.html' || $reqPath === '/geochalk' ||
    preg_match('#^/(?:geochalk/)?(?:board/share|share)/[a-zA-Z0-9_-]+$#i', $reqPath)
) {
    if (file_exists(__DIR__ . '/geochalk.html')) {
        header('Content-Type: text/html; charset=utf-8');
        readfile(__DIR__ . '/geochalk.html');
        exit;
    }
}

// Phục vụ file tĩnh nếu có và không phải là đường dẫn API
if (php_sapi_name() === 'cli-server' && !str_starts_with($reqPath, '/api/')) {
    $staticFile = __DIR__ . $reqPath;
    if (is_file($staticFile)) {
        return false; // Cho PHP server tự phục vụ file tĩnh
    }
}

// Bắt buộc phản hồi JSON cho toàn bộ API bên dưới
header('Content-Type: application/json; charset=utf-8');

// ==============================================================================
// 3. KHỞI TẠO CƠ SỞ DỮ LIỆU SQLITE (PDO SQLITE)
// ==============================================================================
$dataDir = __DIR__ . DIRECTORY_SEPARATOR . 'data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0777, true);
}

$dbPath = $dataDir . DIRECTORY_SEPARATOR . 'geochalk.db';

try {
    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    // 1. Tạo bảng lưu trữ dự án bản vẽ trực tuyến nếu chưa có
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            user_email TEXT,
            title TEXT NOT NULL,
            app_type TEXT NOT NULL DEFAULT '3d',
            xml_data TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
        CREATE INDEX IF NOT EXISTS idx_projects_app_type ON projects(app_type);
    ");

    // 2. Tự động kiểm tra và nâng cấp các cột mới (Migration an toàn cho database đã tồn tại)
    $existingCols = [];
    $stmtCols = $pdo->query("PRAGMA table_info(projects)");
    while ($col = $stmtCols->fetch()) {
        $existingCols[] = strtolower($col['name']);
    }

    if (!in_array('share_id', $existingCols, true)) {
        $pdo->exec("ALTER TABLE projects ADD COLUMN share_id TEXT;");
    }
    if (!in_array('source_share_id', $existingCols, true)) {
        $pdo->exec("ALTER TABLE projects ADD COLUMN source_share_id TEXT;");
    }

    // 3. Tạo Index sau khi chắc chắn các cột đã tồn tại trong bảng
    $pdo->exec("
        CREATE INDEX IF NOT EXISTS idx_projects_share_id ON projects(share_id);
        CREATE INDEX IF NOT EXISTS idx_projects_clone_lookup ON projects(user_id, source_share_id);
    ");

    // Tự động chuyển đổi các file JSON cũ trong data/projects/ vào SQLite (nếu có)
    $oldProjectsDir = $dataDir . DIRECTORY_SEPARATOR . 'projects';
    if (is_dir($oldProjectsDir)) {
        $jsonFiles = glob($oldProjectsDir . DIRECTORY_SEPARATOR . '*.json');
        if (!empty($jsonFiles)) {
            $insertOld = $pdo->prepare("
                INSERT OR IGNORE INTO projects (id, user_id, user_email, title, app_type, xml_data, created_at, updated_at)
                VALUES (:id, :user_id, :user_email, :title, :app_type, :xml_data, :created_at, :updated_at)
            ");
            foreach ($jsonFiles as $jf) {
                $raw = @file_get_contents($jf);
                if ($raw) {
                    $item = json_decode($raw, true);
                    if ($item && !empty($item['id']) && !empty($item['userId']) && !empty($item['xmlData'])) {
                        $insertOld->execute([
                            ':id' => $item['id'],
                            ':user_id' => $item['userId'],
                            ':user_email' => $item['userEmail'] ?? '',
                            ':title' => $item['title'] ?? 'Bản vẽ không tên',
                            ':app_type' => $item['appType'] ?? '3d',
                            ':xml_data' => $item['xmlData'],
                            ':created_at' => $item['createdAt'] ?? date('c'),
                            ':updated_at' => $item['updatedAt'] ?? date('c')
                        ]);
                    }
                }
            }
        }
    }

} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Lỗi kết nối cơ sở dữ liệu SQLite: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// ==============================================================================
// 4. HÀM TIỆN ÍCH TRỢ GIÚP (HELPERS)
// ==============================================================================
function getJsonInput(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function sendResponse(int $statusCode, array $data): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// Lấy endpoint từ PATH_INFO hoặc REQUEST_URI
$endpoint = '';
if (!empty($_GET['endpoint'])) {
    $endpoint = '/' . ltrim($_GET['endpoint'], '/');
} elseif (!empty($_SERVER['PATH_INFO'])) {
    $endpoint = $_SERVER['PATH_INFO'];
} else {
    $endpoint = $reqPath;
}
$endpoint = rtrim($endpoint, '/');
// Loại bỏ tiền tố /geochalk nếu chạy chung Nginx subpath
$endpoint = preg_replace('#^/geochalk(?=/api)#', '', $endpoint);

// Chuẩn hóa method
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// ==============================================================================
// 5. API ROUTE 1: ĐĂNG NHẬP THÔNG QUA API EDUSHARE (PROXY LOGIN)
// ==============================================================================
if ($endpoint === '/api/auth/login' && $method === 'POST') {
    $input = getJsonInput();
    $email = trim($input['email'] ?? '');
    $password = trim($input['password'] ?? '');
    $customAuthUrl = trim($input['authUrl'] ?? '');

    if (empty($email) || empty($password)) {
        sendResponse(400, [
            'status' => 'error',
            'message' => 'Vui lòng nhập đầy đủ địa chỉ Email và Mật khẩu.'
        ]);
    }

    // Danh sách URL máy chủ EduShare (Server 2):
    // Ưu tiên biến môi trường > customAuthUrl (chỉ nhận host an toàn) > IP nội bộ 192.168.1.240:5500 > tên miền EduShare
    $candidateUrls = [];
    $envUrl = getenv('EDUSHARE_AUTH_URL');
    if (!empty($envUrl)) {
        $candidateUrls[] = $envUrl;
    }
    // Chỉ chấp nhận customAuthUrl nếu thuộc whitelist host an toàn và trỏ tới /api/login (chống SSRF & đánh cắp mật khẩu)
    if (!empty($customAuthUrl)) {
        $parsed = parse_url($customAuthUrl);
        $host = strtolower($parsed['host'] ?? '');
        $path = $parsed['path'] ?? '';
        $allowedHosts = ['edushare.vn-ai.cloud', 'math.vn-ai.cloud', '192.168.1.240', 'localhost', '127.0.0.1'];
        if (in_array($host, $allowedHosts, true) && str_ends_with($path, '/api/login')) {
            $candidateUrls[] = $customAuthUrl;
        }
    }
    $candidateUrls[] = 'http://192.168.1.240:5500/api/login';
    $candidateUrls[] = 'https://edushare.vn-ai.cloud/api/login';
    $candidateUrls = array_values(array_unique($candidateUrls));

    $postPayload = json_encode([
        'email' => $email,
        'password' => $password
    ]);

    $lastCurlError = '';
    $lastHttpCode = 0;
    $responseBody = false;
    $connectedUrl = '';

    foreach ($candidateUrls as $url) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postPayload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Content-Length: ' . strlen($postPayload)
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 6);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

        $res = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);

        if (!$err && $code > 0) {
            $responseBody = $res;
            $lastHttpCode = $code;
            $connectedUrl = $url;
            break;
        } else {
            $lastCurlError = $err ?: "HTTP code {$code}";
            $lastHttpCode = $code;
        }
    }

    if ($responseBody === false) {
        sendResponse(502, [
            'status' => 'error',
            'message' => "Không thể kết nối đến máy chủ EduShare (Server 2) qua các địa chỉ: " . implode(', ', $candidateUrls) . ". Chi tiết: {$lastCurlError}"
        ]);
    }

    $edushareData = json_decode($responseBody, true);
    if (!is_array($edushareData)) {
        $edushareData = ['detail' => $responseBody];
    }

    if ($lastHttpCode >= 200 && $lastHttpCode < 300) {
        sendResponse(200, $edushareData);
    } else {
        $msg = $edushareData['detail'] ?? $edushareData['message'] ?? 'Địa chỉ Gmail hoặc mật khẩu không chính xác.';
        sendResponse($lastHttpCode > 0 ? $lastHttpCode : 401, [
            'status' => 'error',
            'message' => $msg
        ]);
    }
}

// ==============================================================================
// 6. API ROUTE 2: LƯU BẢN VẼ LÊN SQLITE THEO TÀI KHOẢN (SAVE ONLINE)
// ==============================================================================
if ($endpoint === '/api/projects/save' && $method === 'POST') {
    $input = getJsonInput();
    $userId = trim($input['userId'] ?? '');
    $userEmail = trim($input['userEmail'] ?? '');
    $title = trim($input['title'] ?? 'Bản vẽ không tên');
    $appType = trim($input['appType'] ?? '3d');
    $xmlData = $input['xmlData'] ?? '';
    $projectId = trim($input['projectId'] ?? '');

    if (empty($userId)) {
        sendResponse(401, [
            'status' => 'error',
            'message' => 'Bạn chưa đăng nhập tài khoản EduShare để lưu bản vẽ.'
        ]);
    }

    if (empty($xmlData) || strlen($xmlData) < 20) {
        sendResponse(400, [
            'status' => 'error',
            'message' => 'Dữ liệu bản vẽ hình học trống hoặc không hợp lệ.'
        ]);
    }

    if (empty($projectId)) {
        $projectId = 'geochalk_prj_' . time() . '_' . substr(bin2hex(random_bytes(4)), 0, 6);
    }

    $now = date('c');

    try {
        // Kiểm tra xem bài vẽ đã tồn tại chưa
        $stmtCheck = $pdo->prepare("SELECT id, created_at FROM projects WHERE id = :id");
        $stmtCheck->execute([':id' => $projectId]);
        $existing = $stmtCheck->fetch();

        if ($existing) {
            // Cập nhật bản vẽ đã có
            $stmtUpdate = $pdo->prepare("
                UPDATE projects
                SET title = :title, app_type = :app_type, xml_data = :xml_data, updated_at = :updated_at
                WHERE id = :id AND user_id = :user_id
            ");
            $stmtUpdate->execute([
                ':title' => $title,
                ':app_type' => $appType,
                ':xml_data' => $xmlData,
                ':updated_at' => $now,
                ':id' => $projectId,
                ':user_id' => $userId
            ]);
        } else {
            // Thêm mới bản vẽ
            $stmtInsert = $pdo->prepare("
                INSERT INTO projects (id, user_id, user_email, title, app_type, xml_data, created_at, updated_at)
                VALUES (:id, :user_id, :user_email, :title, :app_type, :xml_data, :created_at, :updated_at)
            ");
            $stmtInsert->execute([
                ':id' => $projectId,
                ':user_id' => $userId,
                ':user_email' => $userEmail,
                ':title' => $title,
                ':app_type' => $appType,
                ':xml_data' => $xmlData,
                ':created_at' => $now,
                ':updated_at' => $now
            ]);
        }

        sendResponse(200, [
            'status' => 'success',
            'message' => 'Lưu bản vẽ lên tài khoản EduShare thành công!',
            'project' => [
                'id' => $projectId,
                'title' => $title,
                'appType' => $appType,
                'updatedAt' => $now
            ]
        ]);

    } catch (Exception $e) {
        sendResponse(500, [
            'status' => 'error',
            'message' => 'Lỗi lưu bản vẽ vào SQLite: ' . $e->getMessage()
        ]);
    }
}

// ==============================================================================
// 6b. API ROUTE: TẠO HOẶC LẤY LIÊN KẾT CHIA SẺ BẢN VẼ (SHARE)
// ==============================================================================
if ($endpoint === '/api/projects/share' && $method === 'POST') {
    $input = getJsonInput();
    $userId = trim($input['userId'] ?? '');
    $userEmail = trim($input['userEmail'] ?? '');
    $title = trim($input['title'] ?? 'Bản vẽ chia sẻ');
    $appType = trim($input['appType'] ?? '3d');
    $xmlData = $input['xmlData'] ?? '';
    $projectId = trim($input['projectId'] ?? '');
    $clientOrigin = trim($input['origin'] ?? '');
    $clientBasePath = trim($input['basePath'] ?? '');

    if (empty($userId)) {
        sendResponse(401, [
            'status' => 'error',
            'message' => 'Bạn chưa đăng nhập tài khoản để chia sẻ bản vẽ.'
        ]);
    }

    if (empty($xmlData) || strlen($xmlData) < 20) {
        sendResponse(400, [
            'status' => 'error',
            'message' => 'Dữ liệu bản vẽ trống hoặc không hợp lệ.'
        ]);
    }

    if (empty($projectId)) {
        $projectId = 'geochalk_prj_' . time() . '_' . substr(bin2hex(random_bytes(4)), 0, 6);
    }

    $now = date('c');

    try {
        $stmtCheck = $pdo->prepare("SELECT id, user_id, share_id FROM projects WHERE id = :id");
        $stmtCheck->execute([':id' => $projectId]);
        $existing = $stmtCheck->fetch();

        // Tạo hoặc giữ lại share_id duy nhất
        $shareId = !empty($existing['share_id']) ? $existing['share_id'] : ('sh_' . bin2hex(random_bytes(5)));

        if ($existing && $existing['user_id'] === $userId) {
            // Cập nhật bản vẽ của chính mình
            $stmtUpdate = $pdo->prepare("
                UPDATE projects
                SET title = :title, app_type = :app_type, xml_data = :xml_data, share_id = :share_id, updated_at = :updated_at
                WHERE id = :id AND user_id = :user_id
            ");
            $stmtUpdate->execute([
                ':title' => $title,
                ':app_type' => $appType,
                ':xml_data' => $xmlData,
                ':share_id' => $shareId,
                ':updated_at' => $now,
                ':id' => $projectId,
                ':user_id' => $userId
            ]);
        } else {
            // Nếu chưa có hoặc bản vẽ là của người khác, tạo mới
            if ($existing && $existing['user_id'] !== $userId) {
                $projectId = 'geochalk_prj_' . time() . '_' . substr(bin2hex(random_bytes(4)), 0, 6);
                $shareId = 'sh_' . bin2hex(random_bytes(5));
            }
            $stmtInsert = $pdo->prepare("
                INSERT INTO projects (id, user_id, user_email, title, app_type, xml_data, share_id, created_at, updated_at)
                VALUES (:id, :user_id, :user_email, :title, :app_type, :xml_data, :share_id, :created_at, :updated_at)
            ");
            $stmtInsert->execute([
                ':id' => $projectId,
                ':user_id' => $userId,
                ':user_email' => $userEmail,
                ':title' => $title,
                ':app_type' => $appType,
                ':xml_data' => $xmlData,
                ':share_id' => $shareId,
                ':created_at' => $now,
                ':updated_at' => $now
            ]);
        }

        // Tạo share URL định danh trực tiếp: trỏ thẳng vào bảng vẽ, không về Home
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $baseOrigin = !empty($clientOrigin) ? rtrim($clientOrigin, '/') : ($protocol . $host);

        // Xác định đường dẫn tương đối của GeoChalk (ví dụ: /geochalk/geochalk.html hoặc /geochalk.html)
        $chalkPath = !empty($clientBasePath) ? $clientBasePath : '/geochalk.html';
        if (!str_starts_with($chalkPath, '/')) {
            $chalkPath = '/' . $chalkPath;
        }

        // URL trỏ thẳng 100% vào bảng vẽ (tương thích mọi web server kể cả chưa cấu hình rewrite)
        $directUrl = $baseOrigin . $chalkPath . '?app=' . urlencode($appType) . '&share=' . urlencode($shareId);

        // URL trực tiếp dạng đường dẫn RESTful (cho server đã cấu hình rewrite)
        $subPrefix = str_contains($chalkPath, '/geochalk') ? '/geochalk' : '';
        $shareUrl = $baseOrigin . $subPrefix . '/board/share/' . urlencode($shareId);

        sendResponse(200, [
            'status' => 'success',
            'message' => 'Tạo liên kết chia sẻ thành công!',
            'project' => [
                'id' => $projectId,
                'shareId' => $shareId,
                'title' => $title,
                'appType' => $appType,
                'shareUrl' => $shareUrl,
                'directUrl' => $directUrl,
                'updatedAt' => $now
            ]
        ]);

    } catch (Exception $e) {
        sendResponse(500, [
            'status' => 'error',
            'message' => 'Lỗi tạo liên kết chia sẻ: ' . $e->getMessage()
        ]);
    }
}

// ==============================================================================
// 6c. API ROUTE: TỰ ĐỘNG SAO CHÉP BẢN VẼ TỪ LINK CHIA SẺ VÀO SAVE ONLINE (AUTO-CLONE)
// ==============================================================================
if ($endpoint === '/api/projects/clone-share' && $method === 'POST') {
    $input = getJsonInput();
    $shareId = trim($input['shareId'] ?? '');
    $userId = trim($input['userId'] ?? '');
    $userEmail = trim($input['userEmail'] ?? '');

    if (empty($userId)) {
        sendResponse(401, [
            'status' => 'error',
            'authRequired' => true,
            'message' => 'Vui lòng đăng nhập tài khoản EduShare để tự động sao chép và lưu bản vẽ vào Save Online.'
        ]);
    }

    if (empty($shareId)) {
        sendResponse(400, [
            'status' => 'error',
            'message' => 'Thiếu mã định danh liên kết chia sẻ (shareId).'
        ]);
    }

    try {
        // 1. Tìm bản vẽ gốc theo share_id hoặc id dự án
        $stmtFind = $pdo->prepare("
            SELECT * FROM projects
            WHERE share_id = :sid OR id = :sid
            LIMIT 1
        ");
        $stmtFind->execute([':sid' => $shareId]);
        $original = $stmtFind->fetch();

        if (!$original) {
            sendResponse(404, [
                'status' => 'error',
                'message' => 'Không tìm thấy bản vẽ chia sẻ hoặc liên kết đã bị xóa.'
            ]);
        }

        $sourceShareId = !empty($original['share_id']) ? $original['share_id'] : $original['id'];
        $origId = $original['id'];

        // 2. Kiểm tra nếu người mở chính là tác giả bản vẽ gốc (User B chính là User A)
        if ($original['user_id'] === $userId) {
            sendResponse(200, [
                'status' => 'success',
                'isAuthor' => true,
                'isNewClone' => false,
                'message' => 'Bạn là tác giả của bản vẽ gốc này. Đã mở bản vẽ từ tài khoản của bạn.',
                'project' => [
                    'id' => $original['id'],
                    'userId' => $original['user_id'],
                    'userEmail' => $original['user_email'] ?? '',
                    'title' => $original['title'],
                    'appType' => $original['app_type'],
                    'xmlData' => $original['xml_data'],
                    'sourceShareId' => $sourceShareId,
                    'createdAt' => $original['created_at'],
                    'updatedAt' => $original['updated_at']
                ]
            ]);
        }

        // 3. Cơ chế Chống trùng lặp (Idempotency): Kiểm tra User B đã có bản sao từ shareId này chưa
        $stmtCheckClone = $pdo->prepare("
            SELECT * FROM projects
            WHERE user_id = :user_id
              AND (source_share_id = :sid1 OR source_share_id = :sid2)
            ORDER BY updated_at DESC
            LIMIT 1
        ");
        $stmtCheckClone->execute([
            ':user_id' => $userId,
            ':sid1' => $sourceShareId,
            ':sid2' => $origId
        ]);
        $existingClone = $stmtCheckClone->fetch();

        if ($existingClone) {
            sendResponse(200, [
                'status' => 'success',
                'isAuthor' => false,
                'isNewClone' => false,
                'message' => 'Đã tìm thấy bản sao trước đó trong Save Online của bạn.',
                'project' => [
                    'id' => $existingClone['id'],
                    'userId' => $existingClone['user_id'],
                    'userEmail' => $existingClone['user_email'] ?? '',
                    'title' => $existingClone['title'],
                    'appType' => $existingClone['app_type'],
                    'xmlData' => $existingClone['xml_data'],
                    'sourceShareId' => $existingClone['source_share_id'] ?? $sourceShareId,
                    'createdAt' => $existingClone['created_at'],
                    'updatedAt' => $existingClone['updated_at']
                ]
            ]);
        }

        // 4. Nếu chưa có bản sao: Tạo bản sao mới (Auto-Clone) độc lập 100% lưu thẳng vào Save Online
        $now = date('c');
        $newProjectId = 'geochalk_prj_' . time() . '_' . substr(bin2hex(random_bytes(4)), 0, 6);
        $clonedTitle = '[Bản sao] ' . $original['title'];

        $stmtInsertClone = $pdo->prepare("
            INSERT INTO projects (id, user_id, user_email, title, app_type, xml_data, share_id, source_share_id, created_at, updated_at)
            VALUES (:id, :user_id, :user_email, :title, :app_type, :xml_data, NULL, :source_share_id, :created_at, :updated_at)
        ");
        $stmtInsertClone->execute([
            ':id' => $newProjectId,
            ':user_id' => $userId,
            ':user_email' => $userEmail,
            ':title' => $clonedTitle,
            ':app_type' => $original['app_type'],
            ':xml_data' => $original['xml_data'],
            ':source_share_id' => $sourceShareId,
            ':created_at' => $now,
            ':updated_at' => $now
        ]);

        sendResponse(200, [
            'status' => 'success',
            'isAuthor' => false,
            'isNewClone' => true,
            'message' => 'Đã tự động nhân bản và lưu bản vẽ vào mục Save Online của bạn thành công!',
            'project' => [
                'id' => $newProjectId,
                'userId' => $userId,
                'userEmail' => $userEmail,
                'title' => $clonedTitle,
                'appType' => $original['app_type'],
                'xmlData' => $original['xml_data'],
                'sourceShareId' => $sourceShareId,
                'createdAt' => $now,
                'updatedAt' => $now
            ]
        ]);

    } catch (Exception $e) {
        sendResponse(500, [
            'status' => 'error',
            'message' => 'Lỗi tự động sao chép bản vẽ: ' . $e->getMessage()
        ]);
    }
}

// ==============================================================================
// 6d. API ROUTE: LẤY THÔNG TIN XEM TRƯỚC BẢN VẼ CHIA SẺ (SHARE PREVIEW)
// ==============================================================================
if ($endpoint === '/api/projects/share-preview' && $method === 'GET') {
    $shareId = trim($_GET['shareId'] ?? '');

    if (empty($shareId)) {
        sendResponse(400, [
            'status' => 'error',
            'message' => 'Thiếu mã định danh liên kết chia sẻ (shareId).'
        ]);
    }

    try {
        $stmtFind = $pdo->prepare("
            SELECT id, title, app_type, user_email, share_id, created_at, updated_at
            FROM projects
            WHERE share_id = :sid OR id = :sid
            LIMIT 1
        ");
        $stmtFind->execute([':sid' => $shareId]);
        $row = $stmtFind->fetch();

        if (!$row) {
            sendResponse(404, [
                'status' => 'error',
                'message' => 'Không tìm thấy thông tin bản vẽ chia sẻ.'
            ]);
        }

        // Ẩn một phần email tác giả
        $maskedEmail = '';
        if (!empty($row['user_email'])) {
            $parts = explode('@', $row['user_email']);
            if (count($parts) === 2) {
                $namePart = $parts[0];
                $len = strlen($namePart);
                $masked = ($len <= 3) ? $namePart . '***' : substr($namePart, 0, 3) . '***' . substr($namePart, -1);
                $maskedEmail = $masked . '@' . $parts[1];
            } else {
                $maskedEmail = 'Người dùng EduShare';
            }
        }

        sendResponse(200, [
            'status' => 'success',
            'preview' => [
                'shareId' => !empty($row['share_id']) ? $row['share_id'] : $row['id'],
                'title' => $row['title'],
                'appType' => $row['app_type'],
                'author' => $maskedEmail ?: 'Tác giả EduShare',
                'createdAt' => $row['created_at'],
                'updatedAt' => $row['updated_at']
            ]
        ]);
    } catch (Exception $e) {
        sendResponse(500, [
            'status' => 'error',
            'message' => 'Lỗi tải xem trước bản vẽ: ' . $e->getMessage()
        ]);
    }
}

// ==============================================================================
// 7. API ROUTE 3: LẤY DANH SÁCH BẢN VẼ CỦA TÀI KHOẢN (LỌC THEO CHẾ ĐỘ 3D, 2D, CAS)
// ==============================================================================
if ($endpoint === '/api/projects/list' && $method === 'GET') {
    $userId = trim($_GET['userId'] ?? '');
    $filterAppType = trim($_GET['appType'] ?? 'all');

    if (empty($userId)) {
        sendResponse(401, [
            'status' => 'error',
            'message' => 'Thiếu thông tin người dùng (userId).'
        ]);
    }

    try {
        // Đếm số lượng theo từng chế độ
        $stmtCount = $pdo->prepare("
            SELECT app_type, COUNT(*) as cnt
            FROM projects
            WHERE user_id = :user_id
            GROUP BY app_type
        ");
        $stmtCount->execute([':user_id' => $userId]);
        $rowsCount = $stmtCount->fetchAll();

        $counts = [
            'all' => 0,
            '3d' => 0,
            'geometry' => 0,
            'graphing' => 0,
            'cas' => 0
        ];

        foreach ($rowsCount as $rc) {
            $t = $rc['app_type'] ?? '3d';
            $num = (int)$rc['cnt'];
            $counts['all'] += $num;
            if (isset($counts[$t])) {
                $counts[$t] = $num;
            }
        }

        // Lấy danh sách bài vẽ
        $sql = "SELECT id, title, app_type, source_share_id, created_at, updated_at
                FROM projects
                WHERE user_id = :user_id";
        $params = [':user_id' => $userId];

        if (!empty($filterAppType) && $filterAppType !== 'all') {
            $sql .= " AND app_type = :app_type";
            $params[':app_type'] = $filterAppType;
        }

        $sql .= " ORDER BY updated_at DESC";

        $stmtList = $pdo->prepare($sql);
        $stmtList->execute($params);
        $list = $stmtList->fetchAll();

        $formatted = [];
        foreach ($list as $item) {
            $formatted[] = [
                'id' => $item['id'],
                'title' => $item['title'],
                'appType' => $item['app_type'],
                'sourceShareId' => $item['source_share_id'] ?? null,
                'createdAt' => $item['created_at'],
                'updatedAt' => $item['updated_at']
            ];
        }

        sendResponse(200, [
            'status' => 'success',
            'projects' => $formatted,
            'counts' => $counts
        ]);

    } catch (Exception $e) {
        sendResponse(500, [
            'status' => 'error',
            'message' => 'Lỗi truy vấn danh sách bản vẽ: ' . $e->getMessage()
        ]);
    }
}

// ==============================================================================
// 8. API ROUTE 4: LẤY CHI TIẾT DỮ LIỆU BẢN VẼ ĐỂ MỞ VÀO BẢNG
// ==============================================================================
if ($endpoint === '/api/projects/get' && $method === 'GET') {
    $id = trim($_GET['id'] ?? '');
    $userId = trim($_GET['userId'] ?? '');

    if (empty($id)) {
        sendResponse(400, [
            'status' => 'error',
            'message' => 'Thiếu mã bài vẽ (id).'
        ]);
    }

    try {
        $stmt = $pdo->prepare("SELECT * FROM projects WHERE id = :id OR share_id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $project = $stmt->fetch();

        if (!$project) {
            sendResponse(404, [
                'status' => 'error',
                'message' => 'Không tìm thấy bản vẽ này trong hệ thống.'
            ]);
        }

        // Bản vẽ hỗ trợ mở công khai qua liên kết chia sẻ (shared link)
        // Xác định xem người đang truy cập có phải là chủ sở hữu bản vẽ hay không
        $isOwner = (!empty($userId) && $project['user_id'] === $userId);

        sendResponse(200, [
            'status' => 'success',
            'isOwner' => $isOwner,
            'project' => [
                'id' => $project['id'],
                'userId' => $project['user_id'],
                'userEmail' => $project['user_email'] ?? '',
                'title' => $project['title'],
                'appType' => $project['app_type'],
                'xmlData' => $project['xml_data'],
                'createdAt' => $project['created_at'],
                'updatedAt' => $project['updated_at']
            ]
        ]);

    } catch (Exception $e) {
        sendResponse(500, [
            'status' => 'error',
            'message' => 'Lỗi đọc chi tiết bản vẽ: ' . $e->getMessage()
        ]);
    }
}

// ==============================================================================
// 9. API ROUTE 5: XÓA BẢN VẼ KHỎI TÀI KHOẢN
// ==============================================================================
if ($endpoint === '/api/projects/delete' && $method === 'POST') {
    $input = getJsonInput();
    $id = trim($input['id'] ?? '');
    $userId = trim($input['userId'] ?? '');

    if (empty($id) || empty($userId)) {
        sendResponse(400, [
            'status' => 'error',
            'message' => 'Thiếu thông tin mã bài vẽ hoặc người dùng.'
        ]);
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM projects WHERE id = :id AND user_id = :user_id");
        $stmt->execute([
            ':id' => $id,
            ':user_id' => $userId
        ]);

        if ($stmt->rowCount() > 0) {
            sendResponse(200, [
                'status' => 'success',
                'message' => 'Đã xóa bản vẽ thành công.'
            ]);
        } else {
            sendResponse(404, [
                'status' => 'error',
                'message' => 'Không tìm thấy bản vẽ hoặc bạn không có quyền xóa bản vẽ này.'
            ]);
        }

    } catch (Exception $e) {
        sendResponse(500, [
            'status' => 'error',
            'message' => 'Lỗi xóa bản vẽ: ' . $e->getMessage()
        ]);
    }
}

// ==============================================================================
// 10. API ROUTE 6: HEALTHCHECK / KIỂM TRA TRẠNG THÁI SERVER
// ==============================================================================
if ($endpoint === '/api/health' || $endpoint === '/api/status') {
    $currentAuthUrl = getenv('EDUSHARE_AUTH_URL') ?: 'http://192.168.1.240:5500/api/login';
    sendResponse(200, [
        'status' => 'ok',
        'service' => 'GeoChalk PHP Backend',
        'engine' => 'PHP ' . PHP_VERSION,
        'database' => 'SQLite (geochalk.db)',
        'auth_target' => $currentAuthUrl,
        'time' => date('c')
    ]);
}

// Nếu không khớp route nào
sendResponse(404, [
    'status' => 'error',
    'message' => 'Endpoint không tồn tại: ' . $endpoint
]);
