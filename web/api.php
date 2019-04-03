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

function verifyAndGetUserRow($body)
{
    array_key_exists('accessToken', $body) or endRequest(400);

    $accessToken = mysql_real_escape_string($body["accessToken"]);
    $sql = "SELECT * FROM registerdusers WHERE accessToken='$accessToken'";
    $data = mysql_query($sql) or endRequest(404);

    // 401 triggers client to re-login
    mysql_num_rows($data) == 1 or endRequest(401);
    $row = mysql_fetch_array($data);
    mysql_free_result($data);

    return $row;
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
    array_key_exists('cellphone', $body) or endRequest(400);

    $email = mysql_real_escape_string($body["email"]);
    strlen($email) >= 6 or endRequest(400);
    $pass = mysql_real_escape_string($body["pass"]);
    strlen($pass) >= 6 or endRequest(400);
    $cellphone = mysql_real_escape_string($body["cellphone"]);
    strlen($cellphone) >= 10 or endRequest(400);

    $accessToken = getAccessToken();
    $result = array('accessToken' => $accessToken);
    $sql = "INSERT INTO registerdusers(email, password, accessToken, cellphone) VALUES('$email', PASSWORD('$pass'), '$accessToken', '$cellphone')";
    mysql_query($sql) or endRequest(409);
    if (mysql_affected_rows() != 1) {
        endRequest(404);
    }

    echo json_encode($result);
    endRequest(201);
}

if ($cmd == "changePassword") {
    $body = getJsonBody();
    $user = verifyAndGetUserRow($body);
    $userId = $user['id'];

    array_key_exists('pass', $body) or endRequest(400);
    $pass = mysql_real_escape_string($body["pass"]);
    strlen($pass) >= 6 or endRequest(400);

    $newAccessToken = getAccessToken();
    $result = array('accessToken' => $newAccessToken);
    $sql = "UPDATE registerdusers SET password=PASSWORD('$pass'), accessToken='$newAccessToken', resetToken='', resetTokenTime=NULL, lastLogin=NOW() WHERE id='$userId'";
    mysql_query($sql) or endRequest(404);
    if (mysql_affected_rows() != 1) {
        endRequest(404);
    }

    echo json_encode($result);
    endRequest(201);
}

if ($cmd == "uploadAnswers") {
    $body = getJsonBody();
    $user = verifyAndGetUserRow($body);
    $email = $user['email'];

    array_key_exists('answers', $body) or endRequest(400);
    $answers = mysql_real_escape_string(json_encode($body["answers"]));

    $sql = "REPLACE INTO answers(date, email, answer) VALUES(NOW(), '$email', '$answers')";
    mysql_query($sql) or endRequest(404);
    // Replace may affect 2 rows
    if (mysql_affected_rows() == 0) {
        endRequest(404);
    }

    endRequest(201);
}

if ($cmd == "downloadAnswers") {
    $body = getJsonBody();
    $user = verifyAndGetUserRow($body);
    $email = $user['email'];

    $sql = "SELECT answer FROM answers WHERE email='$email'";
    $data = mysql_query($sql) or endRequest(404);
    if (mysql_num_rows($data) == 0) {
        $answers = '{}';
    } else {
        $row = mysql_fetch_array($data);
        $answers = $row['answer'];
    }
    mysql_free_result($data);

    $result = array('answer' => $answers);
    echo json_encode($result);
    endRequest(200);
}

if ($cmd == "getAnswers") {
    $body = getJsonBody();
    $user = verifyAndGetUserRow($body);
    $email = $user['email'];

    $sql = "SELECT date, answer FROM answers WHERE email='$email'";
    $data = mysql_query($sql) or endRequest(404);
    $answerCount = 0;
    if (mysql_num_rows($data) != 0) {
        $row = mysql_fetch_array($data);
        $answer = json_decode($row['answer']);
        $answerCount = count((array)$answer);
    }
    mysql_free_result($data);

    $result = array('answerCount' => $answerCount);
    echo json_encode($result);
    endRequest(200);
}

if ($cmd == "getUserProfile") {
    $body = getJsonBody();
    $user = verifyAndGetUserRow($body);

    $result = array('email' => $user['email'], 'cellphone' => $user['cellphone'], 'nickname' => $user['nickname']);
    echo json_encode($result);
    endRequest(200);
}

if ($cmd == "updateUserProfile") {
    $body = getJsonBody();
    $user = verifyAndGetUserRow($body);
    $userId = $user['id'];

    array_key_exists('cellphone', $body) or endRequest(400);
    $cellphone = mysql_real_escape_string($body["cellphone"]);

    array_key_exists('nickname', $body) or endRequest(400);
    $nickname = mysql_real_escape_string($body["nickname"]);

    $sql = "UPDATE registerdusers SET cellphone='$cellphone', nickname='$nickname' WHERE id='$userId'";
    mysql_query($sql) or endRequest(404);
    if (mysql_affected_rows() != 1) {
        endRequest(404);
    }

    endRequest(200);
}

endRequest(401);
