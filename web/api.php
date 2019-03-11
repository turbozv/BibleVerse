<?php

isset($_GET['c']) or die('No access');

require("lib/config.php");
require("lib/mysql.php");

function endRequest($code)
{
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

function startsWith ($string, $startString)
{
    $len = strlen($startString);
    return (substr($string, 0, $len) === $startString);
}

function getJsonBody()
{
    //Make sure that it is a POST request.
    if (strcasecmp($_SERVER['REQUEST_METHOD'], 'POST') != 0) {
        die('Request method must be POST!');
    }

    //Make sure that the content type of the POST request has been set to application/json
    $contentType = isset($_SERVER["CONTENT_TYPE"]) ? trim($_SERVER["CONTENT_TYPE"]) : '';
    if (!startsWith($contentType, 'application/json')) {
        die('Content type must be: application/json, not: '.$contentType);
    }

    //Receive the RAW post data.
    $content = trim(file_get_contents("php://input"));

    //Attempt to decode the incoming RAW post data from JSON.
    $decoded = json_decode($content, true);

    //If json_decode failed, the JSON is invalid.
    if (!is_array($decoded)) {
        die('Received content contained invalid JSON!');
    }

    return $decoded;
}

$cmd = $_GET['c'];

if ($cmd == "loginUser") {
    $body = getJsonBody();
    array_key_exists('email', $body) or endRequest(400);
    array_key_exists('pass', $body) or endRequest(400);

    $email = mysql_real_escape_string($body["email"]);
    strlen($email) >=6 or endRequest(400);
    $pass = mysql_real_escape_string($body["pass"]);
    strlen($pass) >=6 or endRequest(400);
    $sql = "UPDATE registerdusers SET lastLogin=NOW() WHERE email='$email' AND password=PASSWORD('$pass')";
    mysql_query($sql) or endRequest(404);
    if (mysql_affected_rows() != 1) {
        endRequest(404);
    }

    endRequest(200);
}

if ($cmd == "createUser") {
    $body = getJsonBody();
    array_key_exists('email', $body) or endRequest(400);
    array_key_exists('pass', $body) or endRequest(400);

    $email = mysql_real_escape_string($body["email"]);
    strlen($email) >=6 or endRequest(400);
    $pass = mysql_real_escape_string($body["pass"]);
    strlen($pass) >=6 or endRequest(400);
    $sql = "INSERT INTO registerdusers(email, password) VALUES('$email', PASSWORD('$pass'))";
    mysql_query($sql) or endRequest(409);
    if (mysql_affected_rows() != 1) {
        endRequest(404);
    }

    endRequest(201);
}

if ($cmd == "changePassword") {
    $body = getJsonBody();
    array_key_exists('email', $body) or endRequest(400);
    array_key_exists('pass', $body) or endRequest(400);
    array_key_exists('newPass', $body) or endRequest(400);

    $email = mysql_real_escape_string($body["email"]);
    strlen($email) >=6 or endRequest(400);
    $pass = mysql_real_escape_string($body["pass"]);
    strlen($pass) >=6 or endRequest(400);
    $newPass = mysql_real_escape_string($body["newPass"]);
    strlen($newPass) >=6 or endRequest(400);

    $sql = "UPDATE registerdusers SET password=PASSWORD('$newPass') WHERE email='$email' AND password=PASSWORD('$pass')";
    mysql_query($sql) or endRequest(404);
    if (mysql_affected_rows() != 1) {
        // It's possible that 'pass' is token for resetting password case
        $sql = "UPDATE registerdusers SET password=PASSWORD('$newPass'), resetToken='', resetTokenSentTime=NULL WHERE email='$email' AND resetToken='$pass' AND resetTokenTime >= NOW() - INTERVAL 1 HOUR";
        mysql_query($sql) or endRequest(404);
        mysql_affected_rows() == 1 or endRequest(404);
    }

    endRequest(200);
}
