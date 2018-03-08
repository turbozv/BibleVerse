<?php
require("header.php");
require("lib/mysql.php");

header("content-type:text/html; charset=utf-8");
echo "<p>";

// GeoIP
require 'vendor/autoload.php';
$gi = geoip_open("GeoIP.dat", GEOIP_STANDARD);
$result = getQuery('SELECT DISTINCT room FROM `messages` WHERE length(room) = 36 AND user != "System" ORDER BY createdAt DESC');
while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
    $room = $line['room'];
    $result2 = getQuery("SELECT * FROM `messages` WHERE room='$room' ORDER BY createdAt DESC");
    echo "<p>$room";
    while ($line2 = mysql_fetch_array($result2, MYSQL_ASSOC)) {
        $date = date("Y-m-d H:i:s", $line2['createdAt'] / 1000);
        list($user, $deviceId) = split(' ', $line2['user']);
        $ip = $line2['ip'];
        if ($ip) {
            $address = '['.geoip_country_name_by_addr($gi, $ip).']';
        } else {
            $address = '';
        }
        $message = htmlspecialchars($line2['message']);

        echo "<li>$date [$user] $address: $message";
        
        //$deviceId = $line['deviceId'];
        //echo "<li>".$line["date"]."$platform $address [$deviceId]: ".htmlspecialchars($line["comment"]);
    }
    mysql_free_result($result2);
}
mysql_free_result($result);

geoip_close($gi);

require("footer.php");
