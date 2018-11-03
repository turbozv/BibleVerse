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

$deviceIds = array();

// GeoIP
require 'vendor/autoload.php';
$gi = geoip_open("GeoIP.dat", GEOIP_STANDARD);
$result = getQuery('SELECT * FROM `messages` WHERE length(room) = 36 AND user != "System" ORDER BY createdAt DESC');
while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
    $room = $line['room'];
    if (array_key_exists($room, $deviceIds)) {
        continue;
    }

    $deviceIds[$room] = 1;

    $result2 = getQuery("SELECT * FROM `messages` WHERE room='$room' ORDER BY createdAt DESC");
    echo "<p>$room";
    while ($line2 = mysql_fetch_array($result2, MYSQL_ASSOC)) {
        $date = date("Y-m-d H:i:s", $line2['createdAt'] / 1000);
        $userData = explode(" ", $line2['user']);
        $user = $userData[0];
        $ip = $line2['ip'];
        if ($ip) {
            $address = '['.geoip_country_name_by_addr($gi, $ip).']';
        } else {
            $address = '';
        }
        $message = htmlspecialchars($line2['message']);

        echo "<form method='post'><li>$date [$user] $address: $message  ";
        if (strcasecmp($user, 'System') == 0) {
            $id = $line2['id'];
            echo "<input type='hidden' name='delete' value='$id'><input type='submit' value='删除'>";
        }
        echo "</form>";
    }
    mysql_free_result($result2);
    echo "<form method='post'><input type='hidden' name='room' value='$room'>";
    echo "<br><textarea name='message' cols='80' rows='5'></textarea><br>";
    echo "<input type='submit' value='回复 [$room]'>";
    echo '</form>';
}
mysql_free_result($result);

geoip_close($gi);

require("footer.php");
