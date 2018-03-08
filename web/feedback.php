<?php
require("header.php");
require("lib/mysql.php");

header("content-type:text/html; charset=utf-8");

if (isset($_POST['message']) && isset($_POST['room'])) {
    $room = $_POST['room'];
    $message = $_POST['message'];
    echo "$room ==> $message";

    // TODO
    //getQuery("INSERT INTO messages(`date`, room, user, message) VALUES('$date', $group, $leaderId, '[$users]')");
}

echo "<p>";

// GeoIP
require 'vendor/autoload.php';
$gi = geoip_open("GeoIP.dat", GEOIP_STANDARD);
$result = getQuery('SELECT DISTINCT room FROM `messages` WHERE length(room) = 36 AND user != "System" ORDER BY createdAt DESC');
while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
    $room = $line['room'];
    $result2 = getQuery("SELECT * FROM `messages` WHERE room='$room' ORDER BY createdAt DESC");
    echo "<form method='post'><p>$room";
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

        echo "<li>$date [$user] $address: $message";
    }
    mysql_free_result($result2);
    echo "<input type='hidden' name='room' value='$room'>";
    echo "<br><textarea name='message' cols='80' rows='5'></textarea><br>";
    echo "<input type='submit' value='回复 [$room]'>";
    echo '</form>';
}
mysql_free_result($result);

geoip_close($gi);

require("footer.php");
