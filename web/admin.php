<?php

session_start();

$login_user = $_SESSION['login_user'];
if (isset($login_user)) {
	header("Location: home.php");
	exit;
}
/*foreach ($_POST as $param_name => $param_val) {
	echo "$param_name=>$param_val<br />\n";
}*/

if (isset($_POST['user']) && isset($_POST['pass'])) {
	require("dbconnect.php");
	require("password.php");
	
	$email = mysql_real_escape_string($_POST['user']);
	$result = mysql_query("select pass, email from users where email='$email'") or die('Query failed: ' . mysql_error());
        $row = mysql_fetch_row($result);
	if (!$row) {
		$error = "No user or wrong password!";
	} else {
		$verify = password_verify($_POST['pass'], $row[0]);
		if (!$verify) {
			$error = "No user or wrong password!!";
		} else {
			$_SESSION['login_user'] = $row[1];
			header("Location: home.php");
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
</form>
<br>
<?php echo "<font color='red'>$error"; ?>
