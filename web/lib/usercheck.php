<?php

if (!isset($_SERVER['HTTPS'] )) {
    header("Location: https://www.mycbsf.org/login.php");
    exit;
}

session_start();

if (!isset($_SESSION['login_user_id'])) {
    session_destroy();
    if (strcasecmp(basename($_SERVER['PHP_SELF']), "login.php") != 0) {
        header("Location: login.php");
        exit;
    }
}

$login_user_id = $_SESSION['login_user_id'];
$login_user_email = $_SESSION['login_user_email'];

require("lib/mysql.php");
if (!isset($_SESSION['classIds'])) {
    $_SESSION['classIds'] = getClassIds();
}

if (!isset($_SESSION['classId'])) {
    $_SESSION['classId'] = key($_SESSION['classIds']);
}
