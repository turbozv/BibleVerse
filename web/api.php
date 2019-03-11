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
            break;
        case 401:
            header("HTTP/1.1 401 Unauthorized");
            break;
        case 404:
            header("HTTP/1.1 404 Not Found");
            break;
        case 409:
            header("HTTP/1.1 409 Conflict");
            break;
    }

    exit();
}

function startsWith($string, $startString)
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
        die('Content type must be: application/json, not: ' . $contentType);
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

function getAccessToken()
{
    return mysql_real_escape_string(bin2hex(openssl_random_pseudo_bytes(32)));
}

$cmd = $_GET['c'];

header('Content-Type: application/json');

if ($cmd == "loginUser") {
    $body = getJsonBody();
    array_key_exists('email', $body) or endRequest(400);
    array_key_exists('pass', $body) or endRequest(400);

    $email = mysql_real_escape_string($body["email"]);
    strlen($email) >= 6 or endRequest(400);
    $pass = mysql_real_escape_string($body["pass"]);
    strlen($pass) >= 6 or endRequest(400);

    $sql = "UPDATE registerdusers SET resetToken='', resetTokenTime=NULL, lastLogin=NOW() WHERE email='$email' AND password=PASSWORD('$pass')";
    mysql_query($sql) or endRequest(404);
    $result = array();
    if (mysql_affected_rows() != 1) {
        // It's possible that 'pass' is token for resetting password case
        $accessToken = getAccessToken();
        $sql = "UPDATE registerdusers SET accessToken='$accessToken', resetToken='', resetTokenTime=NULL, lastLogin=NOW() WHERE email='$email' AND resetToken='$pass' AND resetTokenTime >= NOW() - INTERVAL 1 HOUR";
        mysql_query($sql) or endRequest(404);
        mysql_affected_rows() == 1 or endRequest(404);
        $result['ResetPassword'] = true;
        $result['accessToken'] = $accessToken;
    } else {
        $sql = "SELECT accessToken FROM registerdusers WHERE email='$email'";
        $data = mysql_query($sql) or endRequest(404);
        $row = mysql_fetch_array($data);
        $result['accessToken'] = $row['accessToken'];
        mysql_free_result($data);
    }

    echo json_encode($result);
    endRequest(200);
}

if ($cmd == "createUser") {
    $body = getJsonBody();
    array_key_exists('email', $body) or endRequest(400);
    array_key_exists('pass', $body) or endRequest(400);

    $email = mysql_real_escape_string($body["email"]);
    strlen($email) >= 6 or endRequest(400);
    $pass = mysql_real_escape_string($body["pass"]);
    strlen($pass) >= 6 or endRequest(400);

    $accessToken = getAccessToken();
    $result = array('accessToken' => $accessToken);
    $sql = "INSERT INTO registerdusers(email, password, accessToken) VALUES('$email', PASSWORD('$pass'), '$accessToken')";
    mysql_query($sql) or endRequest(409);
    if (mysql_affected_rows() != 1) {
        endRequest(404);
    }

    echo json_encode($result);
    endRequest(201);
}

if ($cmd == "changePassword") {
    $body = getJsonBody();
    array_key_exists('accessToken', $body) or endRequest(400);
    array_key_exists('pass', $body) or endRequest(400);

    $accessToken = mysql_real_escape_string($body["accessToken"]);
    strlen($accessToken) >= 32 or endRequest(400);
    $pass = mysql_real_escape_string($body["pass"]);
    strlen($pass) >= 6 or endRequest(400);

    $newAccessToken = getAccessToken();
    $result = array('accessToken' => $newAccessToken);
    $sql = "UPDATE registerdusers SET password=PASSWORD('$pass'), accessToken='$newAccessToken', resetToken='', resetTokenTime=NULL, lastLogin=NOW() WHERE accessToken='$accessToken'";
    mysql_query($sql) or endRequest(404);
    if (mysql_affected_rows() != 1) {
        endRequest(404);
    }

    echo json_encode($result);
    endRequest(201);
}

if ($cmd == "uploadAnswers") {
    $body = getJsonBody();
    array_key_exists('accessToken', $body) or endRequest(400);
    array_key_exists('answers', $body) or endRequest(400);

    $accessToken = mysql_real_escape_string($body["accessToken"]);
    strlen($accessToken) >= 32 or endRequest(400);
    $answers = mysql_real_escape_string(json_encode($body["answers"]));

    $sql = "SELECT email FROM registerdusers WHERE accessToken='$accessToken'";
    $data = mysql_query($sql) or endRequest(404);
    mysql_num_rows($data) == 1 or endRequest(404);
    $row = mysql_fetch_array($data);
    $email = $row['email'];
    mysql_free_result($data);

    $sql = "REPLACE INTO answers(date, email, answer) VALUES(NOW(), '$email', '$answers')";
    echo $sql;
    mysql_query($sql) or endRequest(404);
    if (mysql_affected_rows() != 1) {
        endRequest(404);
    }

    endRequest(201);
}

if ($cmd == "downloadAnswers") {
    $body = getJsonBody();
    array_key_exists('accessToken', $body) or endRequest(400);

    $accessToken = mysql_real_escape_string($body["accessToken"]);
    strlen($accessToken) >= 32 or endRequest(400);

    $sql = "SELECT answers.answer AS answers FROM answers INNER JOIN registerdusers ON registerdusers.email=answers.email WHERE registerdusers.accessToken='$accessToken'";
    $data = mysql_query($sql) or endRequest(404);
    mysql_num_rows($data) == 1 or endRequest(404);
    $row = mysql_fetch_array($data);
    $answers = $row['answers'];
    mysql_free_result($data);

    $result = array('answers' => $answers);
    echo json_encode($result);
    endRequest(200);
}

endRequest(401);
