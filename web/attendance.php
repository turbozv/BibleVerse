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

$adultData = array();
$leaderMeetingData = array();
$spData = array();
$sp1Data = array();
$sp3Data = array();
$sp6Data = array();
$sgData = array();
$adultGroups = getAdultGroups($class);
$spGroups = getSPGroups($class);
$sgGroups = getSatelightGroups($class);

for ($lesson = 0; $lesson < 30; $lesson++) {
    $leaderTotalUsers = array();
    $row = getRow("select users from attend where class=$class and lesson=$lesson and `group`=1000");
    $usersStr = substr($row[0], 1, strlen($row[0])-2);
    if (strlen($usersStr) > 0) {
        $users = explode(',', $usersStr);
        foreach ($users as $key => $user) {
            if (!in_array($user, $leaderTotalUsers)) {
                array_push($leaderTotalUsers, $user);
            }
        }
    }
    $leaderMeetingData[$lesson] = $leaderTotalUsers;

    $adultTotalUsers = array();
    foreach ($adultGroups as $key => $group) {
        $row = getRow("select users from attend where class=$class and lesson=$lesson and `group`=$group");
        $usersStr = substr($row[0], 1, strlen($row[0])-2);
        if (strlen($usersStr) == 0) {
            continue;
        }
        $users = explode(',', $usersStr);
        foreach ($users as $key => $user) {
            if (!in_array($user, $adultTotalUsers)) {
                array_push($adultTotalUsers, $user);
            }
        }
    }
    $adultData[$lesson] = $adultTotalUsers;

    $sp1Data[$lesson] = array();
    $sp3Data[$lesson] = array();
    $sp6Data[$lesson] = array();
    foreach ($spGroups as $key => $group) {
        $row = getRow("select users from attend where class=$class and lesson=$lesson and `group`=$group");
        $usersStr = substr($row[0], 1, strlen($row[0])-2);
        if (strlen($usersStr) == 0) {
            continue;
        }
        $users = explode(',', $usersStr);
        if ($group == 100) {
            $sp1Data[$lesson] = $users;
        } else if ($group == 101) {
            $sp3Data[$lesson] = $users;
        } else {
            $sp6Data[$lesson] = $users;
        }
    }
    $spData[$lesson] = array_merge($sp1Data[$lesson], $sp3Data[$lesson], $sp6Data[$lesson]);

    $sgData[$lesson] = array();
    foreach ($sgGroups as $key => $group) {
        $row = getRow("select users from attend where class=$class and lesson=$lesson and `group`=$group");
        $usersStr = substr($row[0], 1, strlen($row[0])-2);
        if (strlen($usersStr) == 0) {
            continue;
        }
        $users = explode(',', $usersStr);
        $sgData[$lesson] = array_merge($sgData[$lesson], $users);
    }
}

echo "<h4>BSF报表<br>";
echo "<table border=1><tr><td style='min-width: 280px;'>";
for ($lesson = 0; $lesson < 30; $lesson++) {
    echo "<td width='30' align='center'>#$lesson";
}

echo "<tr><td>成人小组";
for ($lesson = 0; $lesson < 30; $lesson++) {
    echo "<td align='center'>".count($adultData[$lesson]);
}

foreach ($spGroups as $key => $group) {
    if ($group == 100) {
        $spGroup = 'Level 1';
    } else if ($group == 101) {
        $spGroup = 'Level 3';
    } else {
        $spGroup = 'Senior Level';
    }
    echo "<tr><td>儿童 $spGroup";
    for ($lesson = 0; $lesson < 30; $lesson++) {
        if ($group == 100) {
            $data = $sp1Data[$lesson];
        } else if ($group == 101) {
            $data = $sp3Data[$lesson];
        } else {
            $data = $sp6Data[$lesson];
        }
        echo "<td align='center'>".count($data);
    }
}
echo "</table>";

$adultTotalCount = array();
for ($lesson = 0; $lesson < 30; $lesson++) {
    $adultTotalCount[$lesson] = 0;
}
$allGroups = array_merge(array(1000));//, $adultGroups, $spGroups, $sgGroups);
foreach ($allGroups as $key => $group) {
    echo "<h4>".getGroupDisplayName($class, $group)."<br>";
    echo "<table border=1><tr><td style='min-width: 280px;'>";
    for ($lesson = 0; $lesson < 30; $lesson++) {
        echo "<td width='30' align='center'>#$lesson";
    }

    $totalCount = array();
    for ($lesson = 0; $lesson < 30; $lesson++) {
        $totalCount[$lesson] = 0;
    }
    $members = getMembers($class, $group);
    $id = 1;
    while (list($userId, $name) = each($members)) {
        echo "<tr><td>$id. $name (<a href='users.php?user=$userId'>#$userId</a>)";
        for ($lesson = 0; $lesson < 30; $lesson++) {
            if ($group < 100 && in_array($userId, $adultData[$lesson]) ||
                $group < 500 && in_array($userId, $spData[$lesson]) ||
                $group >= 500 && in_array($userId, $sgData[$lesson]) ||
                $group == 1000 && in_array($userId, $leaderMeetingData[$lesson])) {
                $check = '√';
                $totalCount[$lesson]++;
            } else {
                $check = ' ';
            }

            echo "<td align='center'>$check";
        }
        $id++;
    }

    echo "<tr><td style='min-width: 280px;'>出勤人数";
    for ($lesson = 0; $lesson < 30; $lesson++) {
        echo "<td width='30' align='center'>".$totalCount[$lesson];
        if (in_array($group, $adultGroups)) {
            $adultTotalCount[$lesson] += $totalCount[$lesson];
        }
    }

    echo "</table>";
}

echo "<h4>系统核对<br>";
echo "<table border=1><tr><td style='min-width: 280px;'>";
for ($lesson = 0; $lesson < 30; $lesson++) {
    echo "<td width='30' align='center'>#$lesson";
}
echo "<tr><td>BSF报表成人小组";
for ($lesson = 0; $lesson < 30; $lesson++) {
    echo "<td align='center'>".count($adultData[$lesson]);
}
echo "<tr><td style='min-width: 280px;'>各小组出勤总数";
for ($lesson = 0; $lesson < 30; $lesson++) {
    echo "<td width='30' align='center'>".$adultTotalCount[$lesson];
}
echo "</table>";

require("footer.php");
?>
