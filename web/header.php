<?php
require("lib/usercheck.php");
$startTime = round(microtime(true) * 1000);
?>

<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body {
  margin: 0;
  font-family: Arial, Helvetica, sans-serif;
}

.topnav {
  overflow: hidden;
  background-color: #333;
}

.topnav a {
  float: left;
  color: #f2f2f2;
  text-align: center;
  padding: 14px 16px;
  text-decoration: none;
  font-size: 17px;
}

.topnav a:hover {
  background-color: #ddd;
  color: black;
}

.topnav a.active {
  background-color: #fcaf17;//#4CAF50;
  color: white;
}
</style>
</head>
<body>

<?php
function getLink($page, $name)
{
    if (basename($_SERVER['PHP_SELF']) == $page) {
        return "<a class='active'>$name</a>";
    } elseif ($page == 'index.php' || $page=='logout.php' || $page=='chatroom.php' || $page=='discussion.php' ||
              (isset($_SESSION[$page]) && $_SESSION[$page] == '1')) {
        return "<a href=$page>$name</a>";
    } else {
        return "";
    }
}
?>

<div class="topnav">
<?php 
echo getLink("index.php", "Home");
echo getLink("attendanceAdult.php", "Attendance(Adult)");
echo getLink("attendanceSP.php", "Attendance(SP)");
echo getLink("attendanceSG.php", "Attendance(Satelight)");
echo getLink("users.php", "Users");
echo getLink("feedback.php", "Feedback");
echo getLink("status.php", "CBSF Chart");
echo getLink("chatroom.php", "Chatroom");
echo getLink("discussion.php", "Discussion");
echo getLink("phpMyAdmin.php", "PhpMyAdmin");
echo getLink("logout.php", "Logout");
?>
</div>

<div style="padding-left:16px">
