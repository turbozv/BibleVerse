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

$result = getQuery("SELECT * FROM `messages` WHERE room='chat' ORDER BY createdAt DESC");
while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
    $date = date("Y-m-d H:i:s", $line['createdAt'] / 1000);
    $userData = explode(" ", $line['user']);
    $user = $userData[0];
    $ip = $line['ip'];
    if ($ip) {
        $address = '['.geoip_country_name_by_addr($gi, $ip).']';
    } else {
        $address = '';
    }
    $message = htmlspecialchars($line['message']);

    echo "<form method='post'><li>$date [$user] $address: $message  ";
    $id = $line['id'];
    echo "<input type='hidden' name='delete' value='$id'><input type='submit' value='删除'>";
    echo "</form>";
}
mysql_free_result($result);

geoip_close($gi);

require("footer.php");
