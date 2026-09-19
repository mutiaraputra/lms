<?php
// Simple endpoint to add API credit (server-side).
// Usage: POST /api/add_credit.php with form-data or JSON:
//  - token (required): server admin token
//  - amount (required): integer > 0
//  - device (optional): target device identifier (string)
//
// Stores state in credits.json (same folder). Thread-safe using file locking.
// Response: JSON { "success": true, "message": "...", "added": n, "device": "...", "apiCallCredit": total }

header('Content-Type: application/json; charset=utf-8');

// Configure your admin token here (keep secret)
$ADMIN_TOKEN = 'REPLACE_WITH_A_STRONG_TOKEN';

// Storage file (create next to this script)
$dataFile = __DIR__ . '/credits.json';

// Read input (support JSON or form)
$input = file_get_contents('php://input');
$params = $_POST;
if (empty($params) && !empty($input)) {
    $decoded = json_decode($input, true);
    if (is_array($decoded)) {
        $params = $decoded;
    }
}

$token = isset($params['token']) ? trim($params['token']) : '';
$amount = isset($params['amount']) ? intval($params['amount']) : 0;
$device = isset($params['device']) ? trim($params['device']) : null;

if ($token !== $ADMIN_TOKEN) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Invalid token']);
    exit;
}

if ($amount <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Amount must be a positive integer']);
    exit;
}

// Ensure file exists with initial structure
$initial = ['total' => 0, 'global_pending' => 0, 'devices' => new stdClass()];
if (!file_exists($dataFile)) {
    file_put_contents($dataFile, json_encode($initial, JSON_PRETTY_PRINT));
}

// Load, update and save with exclusive lock
$fp = fopen($dataFile, 'c+');
if ($fp === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Cannot open storage file']);
    exit;
}

flock($fp, LOCK_EX);
fseek($fp, 0);
$contents = stream_get_contents($fp);
$data = json_decode($contents, true);
if (!is_array($data)) {
    $data = ['total' => 0, 'global_pending' => 0, 'devices' => []];
}

// Apply update
if ($device === null || $device === '') {
    // Add to global pending and total
    $data['global_pending'] = isset($data['global_pending']) ? intval($data['global_pending']) + $amount : $amount;
} else {
    if (!isset($data['devices'][$device])) {
        $data['devices'][$device] = ['pending' => 0, 'total' => 0];
    }
    $data['devices'][$device]['pending'] = intval($data['devices'][$device]['pending']) + $amount;
}

// Also reflect in server-side total (optional)
$data['total'] = isset($data['total']) ? intval($data['total']) + $amount : $amount;

// Save
rewind($fp);
ftruncate($fp, 0);
fwrite($fp, json_encode($data, JSON_PRETTY_PRINT));
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

// Return success and new totals
$result = [
    'success' => true,
    'message' => 'Credit added',
    'added' => $amount,
    'device' => $device,
    'apiCallCredit' => $data['total']
];

echo json_encode($result);