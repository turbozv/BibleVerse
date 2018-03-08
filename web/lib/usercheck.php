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
$login_user_name = $_SESSION['login_user_name'];
$login_user_isAdmin = $_SESSION['login_user_isAdmin'];
