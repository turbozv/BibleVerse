<?php
require("header.php");
require("lib/mysql.php");

header("content-type:text/html; charset=utf-8");

if (isset($_POST['delete'])) {
    $id =  mysql_real_escape_string($_POST['delete']);
    //echo "Delete message $id";
    getQuery("DELETE FROM messages WHERE id=$id;");
}

echo "<p>";

// GeoIP
require 'vendor/autoload.php';
$gi = geoip_open("GeoIP.dat", GEOIP_STANDARD);
$result = getQuery("SELECT DISTINCT room FROM `messages` WHERE length(room) != 36 AND room != 'chat' ORDER BY room DESC");
while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
    $room = $line['room'];
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
        $id = $line2['id'];
        echo "<input type='hidden' name='delete' value='$id'><input type='submit' value='删除'>";
        echo "</form>";
    }
    mysql_free_result($result2);
}
mysql_free_result($result);

geoip_close($gi);

require("footer.php");
