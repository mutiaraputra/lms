<?php
// Endpoint for clients to fetch pending credit for their device.
// Usage: GET /api/get_credit.php?device=DEVICE_ID
// Response: JSON { "add": n, "apiCallCredit": total }
// If "add" > 0 the endpoint will clear the pending amount for that device (one-time).
// If no device is provided, the endpoint returns global_pending and clears it.

header('Content-Type: application/json; charset=utf-8');

$dataFile = __DIR__ . '/credits.json';
if (!file_exists($dataFile)) {
    // No data yet
    echo json_encode(['add' => 0, 'apiCallCredit' => 0]);
    exit;
}

$device = isset($_GET['device']) ? trim($_GET['device']) : null;

// Load with exclusive lock to safely clear pending
$fp = fopen($dataFile, 'c+');
if ($fp === false) {
    http_response_code(500);
    echo json_encode(['add' => 0, 'apiCallCredit' => 0, 'error' => 'Cannot open storage file']);
    exit;
}

flock($fp, LOCK_EX);
fseek($fp, 0);
$contents = stream_get_contents($fp);
$data = json_decode($contents, true);
if (!is_array($data)) {
    $data = ['total' => 0, 'global_pending' => 0, 'devices' => []];
}

$add = 0;
if ($device === null || $device === '') {
    // Return global pending
    $add = isset($data['global_pending']) ? intval($data['global_pending']) : 0;
    // Apply to total and clear pending
    if ($add > 0) {
        $data['total'] = isset($data['total']) ? intval($data['total']) : 0;
        // total already includes added by add_credit.php; here we simply clear pending since client will add locally
        $data['global_pending'] = 0;
    }
} else {
    if (isset($data['devices'][$device])) {
        $add = isset($data['devices'][$device]['pending']) ? intval($data['devices'][$device]['pending']) : 0;
        if ($add > 0) {
            $data['devices'][$device]['total'] = isset($data['devices'][$device]['total']) ? intval($data['devices'][$device]['total']) + $add : $add;
            $data['devices'][$device]['pending'] = 0;
        }
    } else {
        $add = 0;
    }
}

// Save changes
rewind($fp);
ftruncate($fp, 0);
fwrite($fp, json_encode($data, JSON_PRETTY_PRINT));
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

// Return add and current server total (useful for debugging)
echo json_encode([
    'add' => $add,
    'apiCallCredit' => isset($data['total']) ? intval($data['total']) : 0
]);