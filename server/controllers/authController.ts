import { Request, Response } from "express";
import { googleDriveService } from "../services/googleDriveService";

export const authController = {
  getAuthUrl: (req: Request, res: Response) => {
    const url = googleDriveService.getAuthUrl();
    res.json({ url });
  },

  callback: async (req: Request, res: Response) => {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send("Missing code");
    }

    try {
      const tokens = await googleDriveService.getTokens(code as string);
      
      // Store tokens in a secure cookie
      res.cookie("google_tokens", JSON.stringify(tokens), {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error("OAuth callback error:", error);
      res.status(500).send("Authentication failed");
    }
  },

  status: (req: Request, res: Response) => {
    const tokens = req.cookies.google_tokens;
    res.json({ connected: !!tokens });
  },

  logout: (req: Request, res: Response) => {
    res.clearCookie("google_tokens", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.json({ success: true });
  }
};
