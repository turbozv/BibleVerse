<?php

isset($_GET['c']) or die('No access');

require("lib/config.php");
require("lib/mysql.php");

function endRequest($code) {
    switch ($code) {
        case 200:
            header("HTTP/1.1 200 OK");
            break;
        case 201:
            header("HTTP/1.1 201 Created");
            break;
        case 400:
            header("HTTP/1.1 400 Bad Request");
        case 404:
            header("HTTP/1.1 404 Not Found");
            break;
        case 409:
            header("HTTP/1.1 409 Conflict");
            break;
    }
    
    exit();
}

$cmd = $_GET['c'];
if ($cmd == "createUser") {
    isset($_POST['email']) or endRequest(400);
    isset($_POST['pass']) or endRequest(400);

    $email = htmlspecialchars($_POST['email']);
    $pass = htmlspecialchars($_POST['pass']);
    $sql = "INSERT INTO registerdusers(email, password) VALUES('$email', PASSWORD('$pass'))";
    mysql_query($sql) or endRequest(409);
    if (mysql_affected_rows() != 1) {
        endRequest(404);
    }

    endRequest(201);
} else if ($cmd == "changePassword") {
    isset($_POST['email']) or endRequest(400);
    isset($_POST['pass']) or endRequest(400);
    isset($_POST['newPass']) or endRequest(400);

    $email = htmlspecialchars($_POST['email']);
    $pass = htmlspecialchars($_POST['pass']);
    $newPass = htmlspecialchars($_POST['newPass']);
    $sql = "UPDATE registerdusers SET password=PASSWORD('$newPass') WHERE email='$email' AND password=PASSWORD('$pass')";
    mysql_query($sql) or endRequest(404);
    if (mysql_affected_rows() != 1) {
        endRequest(404);
    }

    endRequest(200);
} else if ($cmd == "forgetPassword") {

} else if ($cmd == "resetPassword") {

}