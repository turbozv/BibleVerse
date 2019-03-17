<?php
require("header.php");

header("content-type:text/html; charset=utf-8");

if (isset($_POST['delete'])) {
    $id =  mysql_real_escape_string($_POST['delete']);
    //echo "Delete message $id";
    getQuery("DELETE FROM messages WHERE id=$id;");
}

if (isset($_POST['message']) && isset($_POST['room'])) {
    $room = mysql_real_escape_string($_POST['room']);
    $message = mysql_real_escape_string($_POST['message']);
    $milliseconds = round(microtime(true) * 1000);
    //echo "$room ==> $message, $milliseconds";
    getQuery("INSERT INTO messages(room, createdAt, user, ip, message) VALUES('$room', $milliseconds, 'System', '', '$message')");
}

echo "<p>";

// GeoIP
require 'vendor/autoload.php';
$gi = geoip_open("GeoIP.dat", GEOIP_STANDARD);

function showComment($room) {
    global $gi;
    $result = getQuery("SELECT * FROM `messages` WHERE room='$room' ORDER BY createdAt DESC");
    $first = true;
    while ($line2 = mysql_fetch_array($result, MYSQL_ASSOC)) {
        $date = date("Y-m-d H:i:s", $line2['createdAt'] / 1000);
        $userData = explode(" ", $line2['user']);
        $user = $userData[0];
        $ip = $line2['ip'];
        if ($ip) {
            $address = '[' . geoip_country_name_by_addr($gi, $ip) . ']';
        } else {
            $address = '';
        }
        $message = htmlspecialchars($line2['message']);

        // Not replied message
        echo "$first";
        if ($first && strcasecmp($user, 'System') != 0) {
            echo "<form method='post'><li><b><font color='red'>$date [$user] $address: $message</font></b>";
        } else {
            echo "<form method='post'><li>$date [$user] $address: $message";
        }

        if (strcasecmp($user, 'System') == 0) {
            $id = $line2['id'];
            echo "<input type='hidden' name='delete' value='$id'><input type='submit' value='删除'>";
        }
        echo "</form>";

        $first = false;
    }

    mysql_free_result($result);
    echo "<form method='post'><input type='hidden' name='room' value='$room'>";
    echo "<br><textarea name='message' cols='80' rows='5'></textarea><br>";
    echo "<input type='submit' value='回复 [$room]'>";
    echo '</form>';
}

$deviceIds = array();

$result = getQuery('SELECT * FROM `messages` WHERE length(room) = 36 AND user != "System" ORDER BY createdAt DESC');
$roomList = array();
while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
    $room = $line['room'];
    array_push($roomList, $room);
}
mysql_free_result($result);

$id = 1;
foreach ($roomList as $room) {
    if (array_key_exists($room, $deviceIds)) {
        continue;
    }

    $firstRow = getRowArray("SELECT user FROM `messages` WHERE room='$room' ORDER BY createdAt DESC LIMIT 1");
    if (strcasecmp($firstRow['user'], 'System') == 0) {
        continue;
    }

    $deviceIds[$room] = 1;
    echo "<p>#$id - $room";
    showComment($room);
    $id++;
}

echo "<hr>";

foreach ($roomList as $room) {
    if (array_key_exists($room, $deviceIds)) {
        continue;
    }
    echo "<p>#$id - $room";
    showComment($room);
    $id++;
}

geoip_close($gi);

require("footer.php");
