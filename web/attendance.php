<link rel="stylesheet" href="css/style.css">

<?php
require("header.php");

header("content-type:text/html; charset=utf-8");

// Get user roles
$g_users = getUsers();

$class = $_SESSION['classId'];
$row = getRow("select name, id from class where id=$class");
$className = $row[0];
$class = $row[1];
echo "<h3>出席表 Class: $className</h3>";

$adultGroups = getAdultGroups($class);
$spGroups = getSPGroups($class);
for ($lesson = 0; $lesson < 30; $lesson++) {
    $adultTotalUsers = array();
    foreach ($adultGroups as $key => $group) {
        $row = getRow("select users from attend where class=$class and lesson=$lesson and `group`=$group");
        $usersStr = substr($row[0], 1, strlen($row[0])-2);
        if (count($usersStr) == 0) {
            continue;
        }
        $users = explode(',', $usersStr);
        if (count($users) > 1) {
            $adultTotalUsers = array_merge($adultTotalUsers, $users);
        }
    }

    $spResult = '';
    foreach ($spGroups as $key => $group) {
        $row = getRow("select users from attend where class=$class and lesson=$lesson and `group`=$group");
        $usersStr = substr($row[0], 1, strlen($row[0])-2);
        if (count($usersStr) == 0) {
            continue;
        }
        $users = explode(',', $usersStr);
        if ($group == 100) {
            $spGroup = '1';
        } else if ($group == 101) {
            $spGroup = '3';
        } else {
            $spGroup = 'Senior';
        }
        $spResult .= "<li>儿童 Level $spGroup: ".count($users);
    }

    echo "Lesson#$lesson: <li>成人: ".count($adultTotalUsers).$spResult;
    // foreach ($totalUsers as $key => $user) {
    //     echo "<li>".$g_users[$user]."";
    // }
    echo "<hr>";
}

require("footer.php");
?>
