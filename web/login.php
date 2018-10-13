<?php
session_start();

if (isset($_SESSION['login_user_id'])) {
    header("Location: index.php");
    exit;
}

if (isset($_POST['user']) && isset($_POST['pass'])) {
    require("lib/config.php");
    require("lib/mysql.php");
    require("lib/password.php");

    $email = mysql_real_escape_string($_POST['user']);
    $sql = sprintf("select pass, id, email, adult_attendance, children_attendance, edit_attendance, app_feedback, app_chart, phpMyAdmin from admins where LOWER(email)='%s'", mysql_real_escape_string(strtolower($email)));
    $row = getRow($sql);
    if (!$row) {
        $error = "No user or wrong password!";
    } else {
        $verify = password_verify($_POST['pass'], $row[0]);
        if (!$verify) {
            $error = "No user or wrong password!!";
        } else {
            $_SESSION['login_user_id'] = $row[1];
            $_SESSION['login_user_email'] = $row[2];
            $_SESSION['attendanceAdult.php'] = $row[3];
            $_SESSION['attendanceSP.php'] = $row[4];
            $_SESSION['attendanceSG.php'] = $row[4];
            $_SESSION['editAttendance.php'] = $row[5];
            $_SESSION['feedback.php'] = $row[6];
            $_SESSION['status.php'] = $row[7];
            $_SESSION['phpMyAdmin.php'] = $row[8];
            $_SESSION['users.php'] = $row[5];
            header("Location: index.php");
            exit;
        }
    }
}

?>
<form method='post'>
<table>
<tr>
<td>User: <td><input type='text' name='user'>
</tr>
<tr><td>Password: <td><input type='password' name='pass'>
</tr>
<tr><td><input type='submit'>
</table>
</form>
<?php 
if (isset($error)) {
    echo "<font color='red'>$error";
}
?>