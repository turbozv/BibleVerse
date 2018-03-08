<?php
require("config.php");

date_default_timezone_set($db_timezone);

$link = mysql_connect($db_server, $db_user, $db_password) or die('Could not connect: ' . mysql_error());
mysql_select_db($db_name) or die('Could not select database');
mysql_query("set names utf8mb4;");


function getQuery($sql) {
    $result =  mysql_query($sql) or die('Query failed: ' . mysql_error());
    return $result;
}

function getRow($sql) {
    $result = mysql_query($sql) or die('Query failed: ' . mysql_error());
    $row = mysql_fetch_row($result);
    mysql_free_result($result);
    return $row;
}

?>
