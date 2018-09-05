<?php

if (!isset($_SERVER['HTTPS'] )) {
    header("Location: https://www.mycbsf.org/login.php");
    exit;
}

session_start();

function isUserValid()
{
    if (!isset($_SESSION['login_user_id'])) {
        return false;
    }

    $page = basename($_SERVER['PHP_SELF']);
    if ($page != 'index.php' && $page !='logout.php' && $page!='chatroom.php' && $page!='discussion.php') {
        if (!isset($_SESSION[$page]) || intVal($_SESSION[$page]) != 1) {
            return false;
        }
    }

    return true;
}

if (!isUserValid()) {
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
