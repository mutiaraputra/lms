<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Protected Page</title>
    <style>
         /* Reset */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: Arial, sans-serif;
        }

        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: linear-gradient(135deg, #4a90e2, #005f99);
            color: #333;
        }

        .container {
            background-color: #fff;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);
            max-width: 400px;
            width: 100%;
            text-align: center;
        }

        h2 {
            margin-bottom: 1.5rem;
            color: #005f99;
        }

        label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: bold;
            color: #333;
        }

        input[type="password"] {
            width: 100%;
            padding: 10px;
            margin-bottom: 1rem;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 1rem;
        }

        button {
            background-color: #005f99;
            color: #fff;
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            font-size: 1rem;
            cursor: pointer;
            transition: background-color 0.3s ease;
            width: 100%;
        }

        button:hover {
            background-color: #0077cc;
        }

        .error-message {
            color: red;
            margin-top: 1rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>Akses Kamera</h2>
        <?php if (isset($error)) echo "<p style='color:red;'>$error</p>"; ?>
        <form action="<?php echo base_url('pswcam/authenticate'); ?>" method="POST">
            <input type="hidden" name="<?php echo $this->security->get_csrf_token_name(); ?>" 
                value="<?php echo $this->security->get_csrf_hash(); ?>" />
            <label for="password">Password:</label>
            <input type="password" id="password" name="password" required>
            <button type="submit">Buka Kamera</button>
        </form>

    </div>
</body>
</html>
