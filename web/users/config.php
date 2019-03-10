<?php
require("../lib/config.php");

/* Attempt to connect to MySQL database */
$link = mysqli_connect($db_server, $db_user, $db_password, $db_name);
 
// Check connection
if($link === false){
    die("ERROR: Could not connect. " . mysqli_connect_error());
}
?>