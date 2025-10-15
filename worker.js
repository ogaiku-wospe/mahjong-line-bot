var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/config.js
var Config = class {
  constructor(env) {
    this.env = env;
    this.userId = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  }
  get RECORDS_SHEET_ID() {
    return this.env.RECORDS_SHEET_ID;
  }
  get CONFIG_SHEET_ID() {
    return this.env.CONFIG_SHEET_ID;
  }
  get LINE_CHANNEL_ACCESS_TOKEN() {
    return this.env.LINE_CHANNEL_ACCESS_TOKEN;
  }
  get LINE_CHANNEL_SECRET() {
    return this.env.LINE_CHANNEL_SECRET;
  }
  get GEMINI_API_KEY() {
    return this.env.GEMINI_API_KEY;
  }
  get VISION_API_KEY() {
    return this.env.VISION_API_KEY;
  }
  get GOOGLE_SERVICE_ACCOUNT_EMAIL() {
    return this.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  }
  get GOOGLE_PRIVATE_KEY() {
    return this.env.GOOGLE_PRIVATE_KEY;
  }
  get SCORING() {
    return {
      startingPoints: {
        "\u56DB\u9EBB\u6771\u98A8": 25e3,
        "\u56DB\u9EBB\u534A\u8358": 25e3,
        "\u4E09\u9EBB\u6771\u98A8": 35e3,
        "\u4E09\u9EBB\u534A\u8358": 35e3
      },
      uma4Player: { 1: 15, 2: 5, 3: -5, 4: -15 },
      uma3Player: { 1: 15, 2: 0, 3: -15 },
      participationPoints: 10,
      pointDivisor: 1e3
    };
  }
  /**
   * 現在のシーズンを取得（KVなし、常にGoogle Sheetsから取得）
   */
  async getCurrentSeason(groupId, sheetsClient = null) {
    if (!sheetsClient) {
      console.warn("[WARN] sheetsClient not provided to getCurrentSeason");
      return null;
    }
    try {
      console.log("[DEBUG] Getting current season from Google Sheets (no cache)...");
      const data = await sheetsClient.getValues("season!A:H", this.CONFIG_SHEET_ID);
      if (!data || data.length <= 1) {
        console.warn("[WARN] No season data found in sheet");
        return null;
      }
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const seasonKey = row[1];
        const isCurrent = row[5];
        if (isCurrent && isCurrent.toString().toUpperCase() === "TRUE" && seasonKey) {
          console.log(`[INFO] Current season found: ${seasonKey}`);
          return seasonKey;
        }
      }
      console.warn("[WARN] No current season found (is_current=TRUE not found)");
      return null;
    } catch (error) {
      console.error("[ERROR] Failed to get current season from sheet:", error);
      return null;
    }
  }
  async setCurrentSeason(groupId, seasonKey) {
    console.log("[DEBUG] setCurrentSeason called but KV is not used");
  }
  // ========== LINEマッピング機能（player_master統合版） ==========
  // プレイヤー一覧を取得（player_masterシートから）
  async getPlayers(sheetsClient) {
    try {
      const range = "player_master!A:F";
      const response = await sheetsClient.getValues(range, this.CONFIG_SHEET_ID);
      if (!response || response.length <= 1) {
        return [];
      }
      const [headers, ...rows] = response;
      const userIdIdx = headers.indexOf("user_id");
      const playerNameIdx = headers.indexOf("player_name");
      let lineUserIdIdx = headers.indexOf("line_user_id");
      let lineDisplayNameIdx = headers.indexOf("line_display_name");
      if (userIdIdx === -1 || playerNameIdx === -1) {
        console.error("Required columns not found in player_master");
        return [];
      }
      const players = rows.map((row) => ({
        playerName: row[playerNameIdx] || "",
        lineUserId: lineUserIdIdx !== -1 ? row[lineUserIdIdx] || null : null,
        lineDisplayName: lineDisplayNameIdx !== -1 ? row[lineDisplayNameIdx] || null : null
      })).filter((p) => p.playerName);
      return players;
    } catch (error) {
      console.error("Failed to get players:", error);
      return [];
    }
  }
  // LINE User IDからプレイヤーを検索
  async getPlayerByLineUserId(sheetsClient, lineUserId) {
    const players = await this.getPlayers(sheetsClient);
    return players.find((p) => p.lineUserId === lineUserId);
  }
  // 雀魂名からプレイヤーを検索
  async getPlayerByName(sheetsClient, playerName) {
    const players = await this.getPlayers(sheetsClient);
    return players.find((p) => p.playerName === playerName);
  }
  // LINE表示名からプレイヤーを検索
  async getPlayerByLineDisplayName(sheetsClient, displayName) {
    const players = await this.getPlayers(sheetsClient);
    return players.find((p) => p.lineDisplayName === displayName);
  }
};
__name(Config, "Config");

// src/google-sheets-client.js
var GoogleSheetsClient = class {
  constructor(config) {
    this.config = config;
    this.spreadsheetId = config.RECORDS_SHEET_ID;
    this.accessToken = null;
    this.tokenExpiry = 0;
  }
  async getAccessToken() {
    const now = Math.floor(Date.now() / 1e3);
    if (this.accessToken && now < this.tokenExpiry - 60) {
      return this.accessToken;
    }
    const header = { alg: "RS256", typ: "JWT" };
    const claimSet = {
      iss: this.config.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now
    };
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedClaimSet = this.base64UrlEncode(JSON.stringify(claimSet));
    const signatureInput = `${encodedHeader}.${encodedClaimSet}`;
    const signature = await this.signJWT(signatureInput);
    const jwt = `${signatureInput}.${signature}`;
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });
    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = now + data.expires_in;
    return this.accessToken;
  }
  async signJWT(data) {
    const pemKey = this.config.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n").replace("-----BEGIN PRIVATE KEY-----", "").replace("-----END PRIVATE KEY-----", "").replace(/\s/g, "");
    const binaryKey = this.base64Decode(pemKey);
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const encoder = new TextEncoder();
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      encoder.encode(data)
    );
    return this.base64UrlEncode(signature);
  }
  base64UrlEncode(data) {
    let base64;
    if (typeof data === "string") {
      base64 = btoa(unescape(encodeURIComponent(data)));
    } else if (data instanceof ArrayBuffer) {
      base64 = btoa(String.fromCharCode(...new Uint8Array(data)));
    } else {
      base64 = btoa(data);
    }
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  base64Decode(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
  async getValues(range, sheetId = null) {
    const token = await this.getAccessToken();
    const targetSheetId = sheetId || this.spreadsheetId;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${targetSheetId}/values/${encodeURIComponent(range)}`;
    const response = await fetch(url, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!response.ok) {
      throw new Error(`Failed to get values: ${response.statusText}`);
    }
    const data = await response.json();
    return data.values || [];
  }
  async appendValues(range, values, sheetId = null) {
    const token = await this.getAccessToken();
    const targetSheetId = sheetId || this.spreadsheetId;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${targetSheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ values })
    });
    if (!response.ok) {
      throw new Error(`Failed to append values: ${response.statusText}`);
    }
    return await response.json();
  }
  async updateValues(range, values, sheetId = null) {
    const token = await this.getAccessToken();
    const targetSheetId = sheetId || this.spreadsheetId;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${targetSheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ values })
    });
    if (!response.ok) {
      throw new Error(`Failed to update values: ${response.statusText}`);
    }
    return await response.json();
  }
  async deleteRow(sheetId, rowIndex, spreadsheetId = null) {
    const token = await this.getAccessToken();
    const targetSpreadsheetId = spreadsheetId || this.spreadsheetId;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${targetSpreadsheetId}:batchUpdate`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        requests: [{
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowIndex,
              endIndex: rowIndex + 1
            }
          }
        }]
      })
    });
    if (!response.ok) {
      throw new Error(`Failed to delete row: ${response.statusText}`);
    }
    return await response.json();
  }
  async createSheet(sheetName, spreadsheetId = null) {
    const token = await this.getAccessToken();
    const targetSpreadsheetId = spreadsheetId || this.spreadsheetId;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${targetSpreadsheetId}:batchUpdate`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        requests: [{
          addSheet: {
            properties: {
              title: sheetName
            }
          }
        }]
      })
    });
    if (!response.ok) {
      throw new Error(`Failed to create sheet: ${response.statusText}`);
    }
    return await response.json();
  }
  async getSheetId(sheetName, spreadsheetId = null) {
    const token = await this.getAccessToken();
    const targetSpreadsheetId = spreadsheetId || this.spreadsheetId;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${targetSpreadsheetId}?fields=sheets.properties`;
    const response = await fetch(url, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!response.ok) {
      throw new Error(`Failed to get sheet metadata: ${response.statusText}`);
    }
    const data = await response.json();
    const sheet = data.sheets.find((s) => s.properties.title === sheetName);
    return sheet ? sheet.properties.sheetId : null;
  }
};
__name(GoogleSheetsClient, "GoogleSheetsClient");

// src/score-calculator.js
var ScoreCalculator = class {
  constructor(config) {
    this.config = config.SCORING;
  }
  calculateGameScore(finalPoints, gameType, rank, playerCount) {
    const startingPoints = this.config.startingPoints[gameType] || 25e3;
    const uma = playerCount === 3 ? this.config.uma3Player[rank] : this.config.uma4Player[rank];
    const score = (finalPoints - startingPoints) / this.config.pointDivisor + uma + this.config.participationPoints;
    return score;
  }
  calculateRank(playerScore, allScores) {
    let rank = 1;
    for (let i = 0; i < allScores.length; i++) {
      if (allScores[i] > playerScore) {
        rank++;
      }
    }
    return rank;
  }
};
__name(ScoreCalculator, "ScoreCalculator");

// src/spreadsheet-manager.js
var SpreadsheetManager = class {
  constructor(sheetsClient, config) {
    this.sheets = sheetsClient;
    this.config = config;
  }
  async addGameRecord(seasonKey, data) {
    try {
      let sheetId = await this.sheets.getSheetId(seasonKey, this.config.RECORDS_SHEET_ID);
      if (sheetId === null) {
        await this.sheets.createSheet(seasonKey, this.config.RECORDS_SHEET_ID);
        await this.initializeSheet(seasonKey);
      }
      const now = /* @__PURE__ */ new Date();
      const dateStr = now.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
      const timeStr = now.toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" });
      const timestampStr = now.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
      const row = [
        dateStr,
        timeStr,
        data.gameType || "\u56DB\u9EBB\u534A\u8358",
        data.players[0] || "",
        data.scores[0] || 0,
        data.players[1] || "",
        data.scores[1] || 0,
        data.players[2] || "",
        data.scores[2] || 0,
        data.players[3] || "",
        data.scores[3] || 0,
        "",
        timestampStr
      ];
      await this.sheets.appendValues(`${seasonKey}!A:M`, [row], this.config.RECORDS_SHEET_ID);
      return { success: true };
    } catch (error) {
      console.error("addGameRecord Error:", error);
      return { success: false, error: error.toString() };
    }
  }
  async deleteLastRecord(seasonKey) {
    try {
      const values = await this.sheets.getValues(`${seasonKey}!A:M`, this.config.RECORDS_SHEET_ID);
      if (values.length <= 1) {
        return { success: false, error: "\u524A\u9664\u3059\u308B\u8A18\u9332\u304C\u3042\u308A\u307E\u305B\u3093" };
      }
      const lastRowIndex = values.length - 1;
      const deletedData = values[lastRowIndex];
      const deletedRecord = `${deletedData[3]}/${deletedData[5]}/${deletedData[7]}${deletedData[9] ? "/" + deletedData[9] : ""}`;
      const sheetId = await this.sheets.getSheetId(seasonKey, this.config.RECORDS_SHEET_ID);
      await this.sheets.deleteRow(sheetId, lastRowIndex, this.config.RECORDS_SHEET_ID);
      return { success: true, deletedRecord };
    } catch (error) {
      console.error("deleteLastRecord Error:", error);
      return { success: false, error: error.toString() };
    }
  }
  async initializeSheet(sheetName) {
    const headers = [
      "\u5BFE\u6226\u65E5",
      "\u5BFE\u6226\u6642\u523B",
      "\u5BFE\u6226\u30BF\u30A4\u30D7",
      "\u30D7\u30EC\u30A4\u30E4\u30FC1\u540D",
      "\u30D7\u30EC\u30A4\u30E4\u30FC1\u70B9\u6570",
      "\u30D7\u30EC\u30A4\u30E4\u30FC2\u540D",
      "\u30D7\u30EC\u30A4\u30E4\u30FC2\u70B9\u6570",
      "\u30D7\u30EC\u30A4\u30E4\u30FC3\u540D",
      "\u30D7\u30EC\u30A4\u30E4\u30FC3\u70B9\u6570",
      "\u30D7\u30EC\u30A4\u30E4\u30FC4\u540D",
      "\u30D7\u30EC\u30A4\u30E4\u30FC4\u70B9\u6570",
      "\u30E1\u30E2",
      "\u767B\u9332\u65E5\u6642"
    ];
    await this.sheets.updateValues(`${sheetName}!A1:M1`, [headers], this.config.RECORDS_SHEET_ID);
  }
  async getAllRecords(seasonKey) {
    try {
      const data = await this.sheets.getValues(`${seasonKey}!A:M`, this.config.RECORDS_SHEET_ID);
      if (data.length <= 1) {
        return [];
      }
      const headers = data[0];
      const records = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const record = {};
        for (let j = 0; j < headers.length; j++) {
          record[headers[j]] = row[j];
        }
        records.push(record);
      }
      return records;
    } catch (error) {
      console.error("getAllRecords Error:", error);
      return [];
    }
  }
};
__name(SpreadsheetManager, "SpreadsheetManager");

// src/player-manager.js
var PlayerManager = class {
  constructor(scoreCalculator, sheetsClient, config) {
    this.calculator = scoreCalculator;
    this.sheets = sheetsClient;
    this.config = config;
  }
  calculateStatistics(records) {
    const playerData = {};
    records.forEach((record) => {
      const gameType = record["\u5BFE\u6226\u30BF\u30A4\u30D7"];
      const players = [];
      const scores = [];
      for (let i = 1; i <= 4; i++) {
        const name = record[`\u30D7\u30EC\u30A4\u30E4\u30FC${i}\u540D`];
        const score = record[`\u30D7\u30EC\u30A4\u30E4\u30FC${i}\u70B9\u6570`];
        if (name) {
          players.push({ name, score });
          scores.push(score);
        }
      }
      players.forEach((player) => {
        if (!playerData[player.name]) {
          playerData[player.name] = {
            name: player.name,
            totalGames: 0,
            totalScore: 0,
            totalRawScore: 0,
            ranks: [],
            rawScores: []
          };
        }
        const data = playerData[player.name];
        data.totalGames++;
        const rank = this.calculator.calculateRank(player.score, scores);
        data.ranks.push(rank);
        const gameScore = this.calculator.calculateGameScore(
          player.score,
          gameType,
          rank,
          players.length
        );
        data.totalScore += gameScore;
        data.totalRawScore += player.score;
        data.rawScores.push(player.score);
      });
    });
    const stats = [];
    for (const name in playerData) {
      const data = playerData[name];
      const rankDist = {};
      data.ranks.forEach((r) => {
        if (!rankDist[r])
          rankDist[r] = 0;
        rankDist[r]++;
      });
      stats.push({
        name,
        totalGames: data.totalGames,
        totalScore: data.totalScore,
        avgScore: data.totalScore / data.totalGames,
        avgRank: data.ranks.reduce((a, b) => a + b, 0) / data.ranks.length,
        rankDist,
        winRate: (rankDist[1] || 0) / data.totalGames * 100,
        avgRawScore: data.totalRawScore / data.totalGames,
        maxScore: Math.max(...data.rawScores),
        minScore: Math.min(...data.rawScores)
      });
    }
    stats.sort((a, b) => b.totalScore - a.totalScore);
    return stats;
  }
  // ========== LINEマッピング機能（player_master統合版） ==========
  // プレイヤーのLINE情報を更新
  async updatePlayerLineInfo(playerName, lineUserId, lineDisplayName) {
    try {
      const range = "player_master!A:F";
      const response = await this.sheets.getValues(range, this.config.CONFIG_SHEET_ID);
      if (!response || response.length <= 1) {
        throw new Error("player_master sheet not found");
      }
      const [headers, ...rows] = response;
      const userIdIdx = headers.indexOf("user_id");
      const playerNameIdx = headers.indexOf("player_name");
      const lineUserIdIdx = headers.indexOf("line_user_id");
      const lineDisplayNameIdx = headers.indexOf("line_display_name");
      const updatedAtIdx = headers.indexOf("updated_at");
      if (lineUserIdIdx === -1 || lineDisplayNameIdx === -1) {
        throw new Error("LINE\u5217\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002player_master\u306Bline_user_id\u3068line_display_name\u5217\u3092\u8FFD\u52A0\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
      }
      const rowIndex = rows.findIndex((row) => row[playerNameIdx] === playerName);
      if (rowIndex === -1) {
        throw new Error("Player not found");
      }
      const actualRowIndex = rowIndex + 2;
      const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
      const updatedRow = [...rows[rowIndex]];
      updatedRow[lineUserIdIdx] = lineUserId;
      updatedRow[lineDisplayNameIdx] = lineDisplayName;
      if (updatedAtIdx !== -1) {
        updatedRow[updatedAtIdx] = now;
      }
      await this.sheets.updateValues(
        `player_master!A${actualRowIndex}:F${actualRowIndex}`,
        // 修正: シート名を「player_master」に統一
        [updatedRow],
        this.config.CONFIG_SHEET_ID
      );
      return { success: true };
    } catch (error) {
      console.error("Failed to update player LINE info:", error);
      return { success: false, error: error.toString() };
    }
  }
  // プレイヤーをLINE情報付きで登録
  async registerPlayerWithLine(playerName, lineUserId, lineDisplayName) {
    try {
      const players = await this.config.getPlayers(this.sheets);
      const existingPlayer = players.find((p) => p.playerName === playerName);
      if (existingPlayer) {
        if (existingPlayer.lineUserId) {
          return {
            success: false,
            message: `${playerName}\u306F\u65E2\u306BLINE\u30A2\u30AB\u30A6\u30F3\u30C8\uFF08${existingPlayer.lineDisplayName}\uFF09\u3068\u7D10\u4ED8\u3044\u3066\u3044\u307E\u3059`
          };
        }
        const result = await this.updatePlayerLineInfo(playerName, lineUserId, lineDisplayName);
        if (result.success) {
          return {
            success: true,
            message: `${lineDisplayName}\u3055\u3093\u3092\u96C0\u9B42\u540D\u300E${playerName}\u300F\u3068\u3057\u3066\u767B\u9332\u3057\u307E\u3057\u305F`
          };
        } else {
          return result;
        }
      }
      const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
      const existingUserId = players.length > 0 && players[0] ? (await this.sheets.getValues("player_master!A2:A2", this.config.CONFIG_SHEET_ID))[0]?.[0] : this.config.userId;
      const values = [[
        existingUserId || this.config.userId,
        // A: user_id（既存のものを使用）
        playerName,
        // B: player_name
        lineUserId,
        // C: line_user_id
        lineDisplayName,
        // D: line_display_name
        now,
        // E: created_at
        now
        // F: updated_at
      ]];
      await this.sheets.appendValues(
        "player_master!A:F",
        // 修正: シート名を「player_master」に統一
        values,
        this.config.CONFIG_SHEET_ID
      );
      return {
        success: true,
        message: `${lineDisplayName}\u3055\u3093\u3092\u96C0\u9B42\u540D\u300E${playerName}\u300F\u3068\u3057\u3066\u767B\u9332\u3057\u307E\u3057\u305F`
      };
    } catch (error) {
      console.error("Failed to register player with LINE:", error);
      return { success: false, message: `\u30D7\u30EC\u30A4\u30E4\u30FC\u767B\u9332\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${error.toString()}` };
    }
  }
  // LINE User IDからプレイヤー名を取得
  async getPlayerNameByLineUserId(lineUserId) {
    const player = await this.config.getPlayerByLineUserId(this.sheets, lineUserId);
    return player ? player.playerName : null;
  }
};
__name(PlayerManager, "PlayerManager");

// src/season-manager.js
var SeasonManager = class {
  constructor(sheetsClient, config) {
    this.sheets = sheetsClient;
    this.config = config;
  }
  async createSeason(groupId, seasonName) {
    try {
      const now = /* @__PURE__ */ new Date();
      const seasonKey = `season_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      const existingSeasons = await this.sheets.getValues("season!A:A", this.config.CONFIG_SHEET_ID);
      const existingUserId = existingSeasons && existingSeasons.length > 1 ? existingSeasons[1][0] : this.config.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const timestamp = now.toISOString().slice(0, 19).replace("T", " ");
      const values = [[
        existingUserId,
        // A列: user_id（既存のものを使用）
        seasonKey,
        // B列: season_key
        seasonName,
        // C列: season_name
        this.config.RECORDS_SHEET_ID,
        // D列: spreadsheet_id
        `https://docs.google.com/spreadsheets/d/${this.config.RECORDS_SHEET_ID}`,
        // E列: spreadsheet_url
        "TRUE",
        // F列: is_current
        timestamp,
        // G列: created_at
        timestamp
        // H列: updated_at
      ]];
      await this.sheets.appendValues("season!A:H", values, this.config.CONFIG_SHEET_ID);
      await this.sheets.createSheet(seasonKey, this.config.RECORDS_SHEET_ID);
      const headers = [
        "\u5BFE\u6226\u65E5",
        "\u5BFE\u6226\u6642\u523B",
        "\u5BFE\u6226\u30BF\u30A4\u30D7",
        "\u30D7\u30EC\u30A4\u30E4\u30FC1\u540D",
        "\u30D7\u30EC\u30A4\u30E4\u30FC1\u70B9\u6570",
        "\u30D7\u30EC\u30A4\u30E4\u30FC2\u540D",
        "\u30D7\u30EC\u30A4\u30E4\u30FC2\u70B9\u6570",
        "\u30D7\u30EC\u30A4\u30E4\u30FC3\u540D",
        "\u30D7\u30EC\u30A4\u30E4\u30FC3\u70B9\u6570",
        "\u30D7\u30EC\u30A4\u30E4\u30FC4\u540D",
        "\u30D7\u30EC\u30A4\u30E4\u30FC4\u70B9\u6570",
        "\u30E1\u30E2",
        "\u767B\u9332\u65E5\u6642"
      ];
      await this.sheets.updateValues(`${seasonKey}!A1:M1`, [headers], this.config.RECORDS_SHEET_ID);
      await this.config.setCurrentSeason(groupId, seasonKey);
      return { success: true, seasonKey };
    } catch (error) {
      console.error("createSeason Error:", error);
      return { success: false, error: error.toString() };
    }
  }
  generateSeasonKey(seasonName) {
    const now = /* @__PURE__ */ new Date();
    const timestamp = now.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" }).replace(/\//g, "");
    return seasonName.replace(/\s+/g, "_").toLowerCase() + "_" + timestamp;
  }
  async getAllSeasons() {
    try {
      const data = await this.sheets.getValues("season!A:H", this.config.CONFIG_SHEET_ID);
      if (!data || data.length <= 1) {
        return [];
      }
      const seasons = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[1] && row[2]) {
          seasons.push({
            key: row[1],
            // B列: season_key
            name: row[2],
            // C列: season_name
            createdAt: row[6]
            // G列: created_at
          });
        }
      }
      return seasons;
    } catch (error) {
      console.error("getAllSeasons Error:", error);
      return [];
    }
  }
  async registerPlayer(playerName) {
    try {
      const data = await this.sheets.getValues("player_master!A:F", this.config.CONFIG_SHEET_ID);
      if (!data || data.length === 0) {
        return { success: false, error: "player_master\u30B7\u30FC\u30C8\u304C\u5B58\u5728\u3057\u307E\u305B\u3093" };
      }
      for (let i = 1; i < data.length; i++) {
        if (data[i][1] === playerName) {
          return { success: false, error: "\u65E2\u306B\u767B\u9332\u3055\u308C\u3066\u3044\u307E\u3059" };
        }
      }
      const existingUserId = data.length > 1 && data[1][0] ? data[1][0] : this.config.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
      const values = [[
        existingUserId,
        // A列: user_id（既存のものを使用）
        playerName,
        // B列: player_name
        "",
        // C列: line_user_id（空）
        "",
        // D列: line_display_name（空）
        now,
        // E列: created_at
        now
        // F列: updated_at
      ]];
      await this.sheets.appendValues("player_master!A:F", values, this.config.CONFIG_SHEET_ID);
      return { success: true };
    } catch (error) {
      console.error("registerPlayer Error:", error);
      return { success: false, error: error.toString() };
    }
  }
  async getAllPlayers() {
    try {
      const data = await this.sheets.getValues("player_master!B:B", this.config.CONFIG_SHEET_ID);
      const players = [];
      for (let i = 1; i < data.length; i++) {
        if (data[i][0]) {
          players.push(data[i][0]);
        }
      }
      return players.sort();
    } catch (error) {
      console.error("getAllPlayers Error:", error);
      return [];
    }
  }
};
__name(SeasonManager, "SeasonManager");

// src/image-analyzer.js
var ImageAnalyzer = class {
  constructor(config, sheetsClient = null) {
    this.config = config;
    this.sheetsClient = sheetsClient;
    this.geminiKey = config.GEMINI_API_KEY;
    this.visionKey = config.VISION_API_KEY;
    this.lineAccessToken = config.LINE_CHANNEL_ACCESS_TOKEN;
  }
  // レーベンシュタイン距離を計算（文字列の類似度判定）
  levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + 1
          );
        }
      }
    }
    return dp[m][n];
  }
  // 登録済みプレイヤー名から最も類似した名前を探す
  async correctPlayerName(recognizedName) {
    if (!this.sheetsClient) {
      return recognizedName;
    }
    try {
      const players = await this.config.getPlayers(this.sheetsClient);
      if (!players || players.length === 0) {
        return recognizedName;
      }
      const registeredNames = players.map(p => p.playerName);
      let bestMatch = recognizedName;
      let minDistance = Infinity;
      for (const registeredName of registeredNames) {
        const distance = this.levenshteinDistance(
          recognizedName.toLowerCase(),
          registeredName.toLowerCase()
        );
        const maxLen = Math.max(recognizedName.length, registeredName.length);
        const similarity = 1 - distance / maxLen;
        if (distance < minDistance && similarity >= 0.5) {
          minDistance = distance;
          bestMatch = registeredName;
        }
      }
      if (bestMatch !== recognizedName) {
        console.log(`[INFO] Name corrected: "${recognizedName}" -> "${bestMatch}" (distance: ${minDistance})`);
      }
      return bestMatch;
    } catch (error) {
      console.error("[ERROR] Player name correction failed:", error);
      return recognizedName;
    }
  }
  async analyzeImage(messageId) {
    try {
      console.log("[INFO] Starting image analysis for messageId:", messageId);
      const imageBuffer = await this.getImageBlob(messageId);
      console.log("[INFO] Image buffer retrieved, size:", imageBuffer.byteLength, "bytes");
      
      // Gemini Vision APIで直接画像解析（高精度）
      const result = await this.callGeminiVision(imageBuffer);
      console.log("[INFO] Gemini Vision API completed");
      
      if (result.success && result.players && result.players.length >= 3) {
        const players = [];
        const scores = [];
        for (const p of result.players) {
          if (p.nickname) {
            const correctedName = await this.correctPlayerName(p.nickname);
            players.push(correctedName);
            scores.push(p.score || 25e3);
          }
        }
        console.log("[INFO] Successfully parsed - Players:", players.join(", "));
        console.log("[INFO] Successfully parsed - Scores:", scores.join(", "));
        return {
          success: true,
          players,
          scores
        };
      }
      console.error("[ERROR] Invalid result from Gemini - players count:", result.players ? result.players.length : 0);
      return { success: false, error: "\u753B\u50CF\u304B\u3089\u30D7\u30EC\u30A4\u30E4\u30FC\u60C5\u5831\u3092\u62BD\u51FA\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u624B\u52D5\u3067\u8A18\u9332\u3057\u3066\u304F\u3060\u3055\u3044\u3002" };
    } catch (error) {
      console.error("[ERROR] Image analysis error:", error.message);
      console.error("[ERROR] Error stack:", error.stack);
      return { success: false, error: "\u753B\u50CF\u89E3\u6790\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F: " + error.message };
    }
  }
  async getImageBlob(messageId) {
    const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${this.lineAccessToken}`
      }
    });
    if (!response.ok) {
      throw new Error(`LINE API error: ${response.status} ${response.statusText}`);
    }
    return await response.arrayBuffer();
  }
  // スタックオーバーフローを防ぐ安全なBase64エンコード
  arrayBufferToBase64(buffer) {
    const uint8Array = new Uint8Array(buffer);
    const chunkSize = 8192;
    let binary = "";
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
  }
  // Gemini Vision APIで直接画像を解析（高精度）
  async callGeminiVision(imageBuffer) {
    try {
      console.log("[INFO] Calling Gemini Vision API...");
      const base64Image = this.arrayBufferToBase64(imageBuffer);
      console.log("[INFO] Base64 encoding completed, length:", base64Image.length);
      
      // 登録済みプレイヤー名を取得してプロンプトに含める
      let playerNamesHint = "";
      if (this.sheetsClient) {
        const players = await this.config.getPlayers(this.sheetsClient);
        if (players && players.length > 0) {
          const names = players.map(p => p.playerName).join("、");
          playerNamesHint = `\n\n# 登録済みプレイヤー名（参考）\n以下のいずれかの名前である可能性が高いです：\n${names}\n\nOCRで誤認識している可能性があるため、これらの名前に近い文字列が見つかった場合は、登録済み名前を優先してください。`;
        }
      }
      
      const prompt = `# タスク
麻雀アプリ「雀魂（じゃんたま）」の対戦結果画面から、プレイヤー情報を抽出してJSON形式で返してください。

# 画像の特徴
- 対戦結果画面には各プレイヤーのニックネームと最終点数が表示されています
- プレイヤー名には日本語（ひらがな、カタカナ、漢字）、英数字、記号が含まれる可能性があります
- 点数は5桁または6桁の数値です（例：32000、-800）
${playerNamesHint}

# 抽出ルール
1. プレイヤー名（ニックネーム）と最終点数を正確に抽出
2. 点数は整数のみ（カンマなし）、マイナス点数も対応
3. 3名または4名のプレイヤーが含まれているはず
4. 点数の合計が約100,000点（四麻）または105,000点（三麻）になるはず
5. プレイヤー名に特殊文字や絵文字が含まれていても正確に抽出
6. 類似した文字（例：1とl、0とO）に注意して正確に認識

# 出力形式
以下のJSON形式のみを返してください（説明文やコードブロック記号は不要）：
{"players":[{"nickname":"プレイヤー名1","score":32000},{"nickname":"プレイヤー名2","score":28000},{"nickname":"プレイヤー名3","score":24000},{"nickname":"プレイヤー名4","score":16000}]}`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.geminiKey}`;
      const payload = {
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2000
        }
      };
      
      console.log("[INFO] Using Gemini Vision (direct image analysis)");
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      console.log("[INFO] Gemini Vision API response status:", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[ERROR] Gemini Vision API HTTP error:", response.status, errorText);
        throw new Error("Gemini Vision API error: " + response.status);
      }
      
      const result = await response.json();
      if (result.error) {
        console.error("[ERROR] Gemini Vision API error:", JSON.stringify(result.error));
        throw new Error("Gemini Vision API error: " + result.error.message);
      }
      
      if (result.candidates && result.candidates[0]) {
        const content = result.candidates[0].content;
        if (content.parts && content.parts[0] && content.parts[0].text) {
          const textContent = content.parts[0].text;
          console.log("[INFO] Gemini Vision response received, parsing JSON...");
          console.log("[DEBUG] Response text:", textContent.substring(0, 500));
          
          let jsonMatch = textContent.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            jsonMatch = textContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
            if (jsonMatch) {
              jsonMatch = [jsonMatch[1]];
            }
          }
          
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            console.log("[INFO] JSON parsed successfully, player count:", data.players ? data.players.length : 0);
            return { success: true, players: data.players };
          } else {
            console.error("[ERROR] No JSON found in Gemini Vision response");
            throw new Error("Failed to parse Gemini Vision response");
          }
        }
      }
      throw new Error("Invalid Gemini Vision API response structure");
    } catch (e) {
      console.error("[ERROR] Gemini Vision API Error:", e.message);
      console.error("[ERROR] Error stack:", e.stack);
      throw e;
    }
  }
  async callVisionAPI(imageBuffer) {
    try {
      console.log("[INFO] Calling Vision API...");
      const base64Image = this.arrayBufferToBase64(imageBuffer);
      console.log("[INFO] Base64 encoding completed, length:", base64Image.length);
      const payload = {
        requests: [{
          image: { content: base64Image },
          features: [{ type: "TEXT_DETECTION", maxResults: 100 }],
          imageContext: { languageHints: ["ja", "en"] }
        }]
      };
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${this.visionKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );
      console.log("[INFO] Vision API response status:", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[ERROR] Vision API HTTP error:", response.status, errorText);
        throw new Error("Vision API error: " + response.status);
      }
      const result = await response.json();
      if (result.error) {
        console.error("[ERROR] Vision API error:", JSON.stringify(result.error));
        throw new Error("Vision API error: " + result.error.message);
      }
      if (result.responses && result.responses[0] && result.responses[0].textAnnotations) {
        const text = result.responses[0].textAnnotations[0].description;
        console.log("[INFO] Vision API text extraction successful");
        return text;
      }
      console.warn("[WARN] No text annotations found in Vision API response");
      return "";
    } catch (error) {
      console.error("[ERROR] Vision API call failed:", error.message);
      throw error;
    }
  }
  async callGemini(extractedText) {
    try {
      console.log("[INFO] Calling Gemini API...");
      const prompt = "# \u30BF\u30B9\u30AF\n\u9EBB\u96C0\u30A2\u30D7\u30EA\u300C\u96C0\u9B42\uFF08\u3058\u3083\u3093\u305F\u307E\uFF09\u300D\u306E\u5BFE\u6226\u7D50\u679C\u753B\u9762\u304B\u3089\u3001\u30D7\u30EC\u30A4\u30E4\u30FC\u60C5\u5831\u3092\u62BD\u51FA\u3057\u3066JSON\u5F62\u5F0F\u3067\u8FD4\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n\n# \u753B\u50CF\u306B\u542B\u307E\u308C\u308B\u30C6\u30AD\u30B9\u30C8\uFF08OCR\u7D50\u679C\uFF09\n" + extractedText + '\n\n# \u62BD\u51FA\u30EB\u30FC\u30EB\n1. \u30D7\u30EC\u30A4\u30E4\u30FC\u540D\uFF08\u30CB\u30C3\u30AF\u30CD\u30FC\u30E0\uFF09\u3068\u6700\u7D42\u70B9\u6570\u3092\u62BD\u51FA\n2. \u70B9\u6570\u306F\u6574\u6570\u306E\u307F\uFF08\u30AB\u30F3\u30DE\u306A\u3057\uFF09\n3. 3\u540D\u307E\u305F\u306F4\u540D\u306E\u30D7\u30EC\u30A4\u30E4\u30FC\u304C\u542B\u307E\u308C\u3066\u3044\u308B\u306F\u305A\n4. \u70B9\u6570\u306E\u5408\u8A08\u304C\u7D04100,000\u70B9\uFF08\u56DB\u9EBB\uFF09\u307E\u305F\u306F105,000\u70B9\uFF08\u4E09\u9EBB\uFF09\u306B\u306A\u308B\u306F\u305A\n5. \u30D7\u30EC\u30A4\u30E4\u30FC\u540D\u306B\u7279\u6B8A\u6587\u5B57\u3084\u7D75\u6587\u5B57\u304C\u542B\u307E\u308C\u3066\u3044\u3066\u3082\u6B63\u78BA\u306B\u62BD\u51FA\n\n# \u51FA\u529B\u5F62\u5F0F\n\u4EE5\u4E0B\u306EJSON\u5F62\u5F0F\u306E\u307F\u3092\u8FD4\u3057\u3066\u304F\u3060\u3055\u3044\uFF08\u8AAC\u660E\u6587\u3084\u30B3\u30FC\u30C9\u30D6\u30ED\u30C3\u30AF\u8A18\u53F7\u306F\u4E0D\u8981\uFF09\uFF1A\n{"players":[{"nickname":"\u30D7\u30EC\u30A4\u30E4\u30FC\u540D1","score":32000},{"nickname":"\u30D7\u30EC\u30A4\u30E4\u30FC\u540D2","score":28000},{"nickname":"\u30D7\u30EC\u30A4\u30E4\u30FC\u540D3","score":24000},{"nickname":"\u30D7\u30EC\u30A4\u30E4\u30FC\u540D4","score":16000}]}';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.geminiKey}`;
      const payload = {
        contents: [{
          parts: [
            { text: prompt }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1e3
        }
      };
      console.log("[INFO] Using model: gemini-2.0-flash-exp");
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      console.log("[INFO] Gemini API response status:", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[ERROR] Gemini API HTTP error:", response.status, errorText);
        throw new Error("Gemini API error: " + response.status);
      }
      const result = await response.json();
      if (result.error) {
        console.error("[ERROR] Gemini API error:", JSON.stringify(result.error));
        throw new Error("Gemini API error: " + result.error.message);
      }
      if (result.candidates && result.candidates[0]) {
        const content = result.candidates[0].content;
        if (content.parts && content.parts[0] && content.parts[0].text) {
          const textContent = content.parts[0].text;
          console.log("[INFO] Gemini response received, parsing JSON...");
          let jsonMatch = textContent.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            jsonMatch = textContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
            if (jsonMatch) {
              jsonMatch = [jsonMatch[1]];
            }
          }
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            console.log("[INFO] JSON parsed successfully, player count:", data.players ? data.players.length : 0);
            return { success: true, players: data.players };
          } else {
            console.error("[ERROR] No JSON found in Gemini response");
            throw new Error("Failed to parse Gemini response");
          }
        }
      }
      throw new Error("Invalid Gemini API response structure");
    } catch (e) {
      console.error("[ERROR] Gemini API Error:", e.message);
      console.error("[ERROR] Error stack:", e.stack);
      throw e;
    }
  }
};
__name(ImageAnalyzer, "ImageAnalyzer");

// src/line-api.js
var LineAPI = class {
  constructor(config) {
    this.accessToken = config.LINE_CHANNEL_ACCESS_TOKEN;
  }
  async replyMessage(replyToken, text) {
    const url = "https://api.line.me/v2/bot/message/reply";
    const payload = {
      replyToken,
      messages: [{
        type: "text",
        text
      }]
    };
    try {
      await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error("replyMessage Error:", error);
    }
  }
  async pushMessage(to, text) {
    const url = "https://api.line.me/v2/bot/message/push";
    const payload = {
      to,
      messages: [{
        type: "text",
        text
      }]
    };
    try {
      await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error("pushMessage Error:", error);
    }
  }
  async pushMessageWithQuickReply(to, text, quickReplyItems) {
    const url = "https://api.line.me/v2/bot/message/push";
    const payload = {
      to,
      messages: [{
        type: "text",
        text,
        quickReply: {
          items: quickReplyItems.map((item) => ({
            type: "action",
            action: item
          }))
        }
      }]
    };
    try {
      await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error("pushMessageWithQuickReply Error:", error);
    }
  }
  async pushImage(to, imageUrl) {
    const url = "https://api.line.me/v2/bot/message/push";
    const payload = {
      to,
      messages: [{
        type: "image",
        originalContentUrl: imageUrl,
        previewImageUrl: imageUrl
      }]
    };
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[ERROR] LINE pushImage failed:", response.status, errorText);
        throw new Error(`LINE API error: ${response.status}`);
      }
    } catch (error) {
      console.error("[ERROR] pushImage Error:", error);
      throw error;
    }
  }
  // ========== 新規追加: プロフィール取得機能 ==========
  // グループメンバーのプロフィールを取得
  async getGroupMemberProfile(groupId, userId) {
    const url = `https://api.line.me/v2/bot/group/${groupId}/member/${userId}`;
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.accessToken}`
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to get profile: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("getGroupMemberProfile Error:", error);
      throw error;
    }
  }
  // トークルームメンバーのプロフィールを取得
  async getRoomMemberProfile(roomId, userId) {
    const url = `https://api.line.me/v2/bot/room/${roomId}/member/${userId}`;
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.accessToken}`
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to get profile: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("getRoomMemberProfile Error:", error);
      throw error;
    }
  }
  // ユーザープロフィールを取得
  async getUserProfile(userId) {
    const url = `https://api.line.me/v2/bot/profile/${userId}`;
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.accessToken}`
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to get profile: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("getUserProfile Error:", error);
      throw error;
    }
  }
};
__name(LineAPI, "LineAPI");

// src/message-handler.js
var MessageHandler = class {
  constructor(lineAPI, imageAnalyzer, kvBinding = null) {
    this.lineAPI = lineAPI;
    this.imageAnalyzer = imageAnalyzer;
    this.kv = kvBinding;
    this.lastMentionTime = /* @__PURE__ */ new Map();
  }
  async handleTextMessage(event, commandRouter, ctx = null) {
    const sourceType = event.source.type;
    if (sourceType !== "group") {
      return;
    }
    const groupId = event.source.groupId;
    const userId = event.source.userId;
    const replyToken = event.replyToken;
    const text = event.message.text;
    const mentions = event.message.mention ? event.message.mention.mentionees : [];
    const isMentioned = mentions.some((m) => m.isSelf);
    
    // 画像解析結果からの記録コマンドかチェック（メンションなしでも許可）
    let isImageAnalysisCommand = false;
    if (this.kv && !isMentioned) {
      const kvKey = `image_analysis_result:${groupId}`;
      const storedCommand = await this.kv.get(kvKey);
      if (storedCommand && text.trim() === storedCommand.trim()) {
        isImageAnalysisCommand = true;
        await this.kv.delete(kvKey);
        console.log("[INFO] Image analysis command detected (no mention required)");
      }
    }
    
    if (!isMentioned && !isImageAnalysisCommand) {
      return;
    }
    
    const userMentions = mentions.filter((m) => !m.isSelf);
    const mentionedUsers = [];
    for (const mention of userMentions) {
      try {
        const profile = await this.lineAPI.getGroupMemberProfile(groupId, mention.userId);
        mentionedUsers.push({
          userId: mention.userId,
          displayName: profile.displayName || "\u4E0D\u660E"
        });
      } catch (error) {
        console.error("Failed to get member profile:", error);
        mentionedUsers.push({
          userId: mention.userId,
          displayName: "\u4E0D\u660E"
        });
      }
    }
    const command = text.replace(/@\S+\s*/g, "").trim();
    
    if (this.kv && isMentioned) {
      this.lastMentionTime.set(groupId, Date.now());
    }
    
    await commandRouter.route(command, groupId, userId, replyToken, mentionedUsers, ctx);
  }
  async handleImageMessage(event, ctx) {
    const sourceType = event.source.type;
    console.log("[DEBUG] Image message received - Source type:", sourceType);
    if (sourceType !== "group") {
      console.log("[DEBUG] Image ignored - Not from group");
      return;
    }
    const groupId = event.source.groupId;
    const replyToken = event.replyToken;
    const messageId = event.message.id;
    console.log("[DEBUG] Image details - GroupId:", groupId, "MessageId:", messageId, "ReplyToken:", replyToken);
    
    // KVから画像解析モードの状態を取得
    let lastMention = null;
    if (this.kv) {
      const kvKey = `image_analysis_mode:${groupId}`;
      const stored = await this.kv.get(kvKey);
      if (stored) {
        lastMention = parseInt(stored, 10);
        console.log("[INFO] Retrieved lastMention from KV:", lastMention);
      } else {
        console.log("[INFO] No lastMention found in KV for key:", kvKey);
      }
    } else {
      // フォールバック: メモリから取得
      lastMention = this.lastMentionTime.get(groupId);
      console.log("[INFO] Retrieved lastMention from memory:", lastMention);
    }
    
    const now = Date.now();
    const timeSinceLastMention = lastMention ? (now - lastMention) / 1e3 : null;
    console.log("[INFO] Image received - GroupId:", groupId);
    console.log("[INFO] Last mention time:", lastMention, "Current time:", now);
    console.log("[INFO] Time since last mention:", timeSinceLastMention, "seconds");
    
    if (!lastMention) {
      console.log("[INFO] Image ignored - No recent mention found");
      return;
    }
    
    if (timeSinceLastMention > 60) {
      console.log("[INFO] Image ignored - Timeout (>60s)");
      if (this.kv) {
        await this.kv.delete(`image_analysis_mode:${groupId}`);
      } else {
        this.lastMentionTime.delete(groupId);
      }
      return;
    }
    
    console.log("[INFO] Image accepted! Starting analysis...");
    
    // KVから削除
    if (this.kv) {
      await this.kv.delete(`image_analysis_mode:${groupId}`);
    } else {
      this.lastMentionTime.delete(groupId);
    }
    
    await this.lineAPI.replyMessage(replyToken, "■ 画像を受信しました\n\n解析中です...少々お待ちください\n（解析には5-10秒ほどかかります）");
    ctx.waitUntil(
      this.processImageAsync(groupId, messageId)
    );
  }
  async processImageAsync(groupId, messageId) {
    try {
      console.log("[INFO] Starting image processing - GroupId:", groupId, "MessageId:", messageId);
      const result = await this.imageAnalyzer.analyzeImage(messageId);
      console.log("[INFO] Image analysis completed:", JSON.stringify(result));
      if (result.success) {
        const players = result.players;
        const scores = result.scores;
        let confirmMsg = "\u25A0 \u753B\u50CF\u89E3\u6790\u5B8C\u4E86\n\n";
        confirmMsg += "\u3010\u89E3\u6790\u7D50\u679C\u3011\n";
        players.forEach((name, i) => {
          confirmMsg += `${i + 1}\u4F4D: ${name} - ${scores[i].toLocaleString()}\u70B9
`;
        });
        const recordCommand = `@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot r ${players.join(" ")} ${scores.join(" ")}`;
        const recordCommandNoMention = `r ${players.join(" ")} ${scores.join(" ")}`;
        
        // KVにメンションなしコマンドを保存（60秒有効）
        if (this.kv) {
          const kvKey = `image_analysis_result:${groupId}`;
          await this.kv.put(kvKey, recordCommandNoMention, { expirationTtl: 60 });
          console.log("[INFO] Stored command in KV for quick reply:", recordCommandNoMention);
        }
        
        confirmMsg += `
\u8A18\u9332\u3059\u308B\u306B\u306F\u4EE5\u4E0B\u3092\u9001\u4FE1:
${recordCommand}

\u307E\u305F\u306F\u3001\u4EE5\u4E0B\u306E\u30DC\u30BF\u30F3\u3092\u30BF\u30C3\u30D7\u3057\u3066\u3082\u9001\u4FE1\u3067\u304D\u307E\u3059`;
        await this.lineAPI.pushMessageWithQuickReply(groupId, confirmMsg, [
          {
            type: "message",
            label: "\u3053\u306E\u5185\u5BB9\u3067\u8A18\u9332",
            text: recordCommandNoMention
          }
        ]);
        console.log("[INFO] Success message sent to group");
      } else {
        const errorMsg = "\u25A0 \u753B\u50CF\u89E3\u6790\u306B\u5931\u6557\u3057\u307E\u3057\u305F\n\n\u30A8\u30E9\u30FC\u5185\u5BB9: " + (result.error || "\u4E0D\u660E\u306A\u30A8\u30E9\u30FC") + "\n\n\u624B\u52D5\u3067\u8A18\u9332\u3057\u3066\u304F\u3060\u3055\u3044\n\u4F8B: @\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot \u8A18\u9332 \u5C71\u7530 32000 \u9234\u6728 28000 \u4F50\u85E4 24000 \u7530\u4E2D 16000";
        await this.lineAPI.pushMessageWithQuickReply(groupId, errorMsg, [
          {
            type: "message",
            label: "\u624B\u52D5\u3067\u8A18\u9332",
            text: "@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot r "
          }
        ]);
        console.log("[WARN] Error message sent to group:", result.error);
      }
    } catch (error) {
      console.error("[ERROR] Image processing failed:", error);
      console.error("[ERROR] Error stack:", error.stack);
      try {
        await this.lineAPI.pushMessage(groupId, "\u25A0 \u753B\u50CF\u89E3\u6790\u30A8\u30E9\u30FC\n\n" + error.message + "\n\n\u624B\u52D5\u3067\u8A18\u9332\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
      } catch (pushError) {
        console.error("[ERROR] Failed to send error message:", pushError);
      }
    }
  }
};
__name(MessageHandler, "MessageHandler");

// src/command-router.js
var CommandRouter = class {
  constructor(config, lineAPI, spreadsheetManager, playerManager, seasonManager, scoreCalculator, sheetsClient, rankingImageGenerator, messageHandler = null) {
    this.config = config;
    this.lineAPI = lineAPI;
    this.spreadsheetManager = spreadsheetManager;
    this.playerManager = playerManager;
    this.seasonManager = seasonManager;
    this.calculator = scoreCalculator;
    this.sheets = sheetsClient;
    this.rankingImageGenerator = rankingImageGenerator;
    this.messageHandler = messageHandler;
  }
  async route(command, groupId, userId, replyToken, mentionedUsers = [], ctx = null) {
    try {
      if (this.matchHelp(command)) {
        await this.showHelp(replyToken);
        return;
      }
      if (mentionedUsers.length > 0) {
        const playerRegisterMatch = command.match(/^プレイヤー登録\s+(.+)$/);
        if (playerRegisterMatch) {
          const playerName = playerRegisterMatch[1].trim();
          await this.handlePlayerRegisterWithMention(
            groupId,
            mentionedUsers[0],
            playerName,
            replyToken
          );
          return;
        }
        const mentionRecordMatch = command.match(/^(記録|r|rec)(.*)$/);
        if (mentionRecordMatch) {
          await this.handleQuickRecordWithMentions(
            mentionRecordMatch[1],
            groupId,
            userId,
            replyToken,
            mentionedUsers
          );
          return;
        }
      }
      const quickMatch = command.match(/^(記録|r|rec)\s+(.+)$/);
      if (quickMatch) {
        await this.handleQuickRecord(quickMatch[2], groupId, userId, replyToken);
        return;
      }
      if (command.match(/^(取消|取り消し|undo|u)$/)) {
        await this.handleUndo(groupId, replyToken);
        return;
      }
      if (this.matchRanking(command)) {
        await this.handleRanking(groupId, replyToken);
        return;
      }
      if (command.match(/^(ランキング画像|rankimg|ri|画像)$/)) {
        await this.handleRankingImage(groupId, replyToken, false, ctx);
        return;
      }
      if (command.match(/^(画像解析|img|image|解析)$/)) {
        await this.handleImageAnalysisRequest(groupId, replyToken);
        return;
      }
      const statsMatch = command.match(/^(統計|s|st|stats)\s*(.*)$/);
      if (statsMatch) {
        const playerName = statsMatch[2].trim();
        await this.handleStats(groupId, playerName, replyToken);
        return;
      }
      const seasonCreateMatch = command.match(/^(シーズン作成|sc|season create)\s+(.+)$/);
      if (seasonCreateMatch) {
        const seasonName = seasonCreateMatch[2].trim();
        await this.handleSeasonCreate(groupId, seasonName, replyToken);
        return;
      }
      const seasonSwitchMatch = command.match(/^(シーズン切替|sw|season switch)\s+(.+)$/);
      if (seasonSwitchMatch) {
        const seasonKey = seasonSwitchMatch[2].trim();
        await this.handleSeasonSwitch(groupId, seasonKey, replyToken);
        return;
      }
      if (command.match(/^(シーズン一覧|sl|seasons)$/)) {
        await this.handleSeasonList(groupId, replyToken);
        return;
      }
      const playerMatch = command.match(/^(プレイヤー登録|pr|player reg)\s+(.+)$/);
      if (playerMatch) {
        const playerName = playerMatch[2].trim();
        await this.handlePlayerRegister(groupId, playerName, replyToken);
        return;
      }
      if (command.match(/^(プレイヤー一覧|pl|players)$/)) {
        await this.handlePlayerList(groupId, replyToken);
        return;
      }
      await this.lineAPI.replyMessage(
        replyToken,
        "\u25A0 \u30B3\u30DE\u30F3\u30C9\u304C\u8A8D\u8B58\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\n\n\u4F7F\u3044\u65B9\u3092\u78BA\u8A8D:\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot h\n\n\u3088\u304F\u4F7F\u3046\u30B3\u30DE\u30F3\u30C9\uFF08\u77ED\u7E2E\u5F62\uFF09:\n\u30FB \u8A18\u9332: @\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot r [\u540D\u524D] [\u70B9\u6570] ...\n\u30FB \u30E9\u30F3\u30AD\u30F3\u30B0: @\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot rank\n\u30FB \u53D6\u6D88: @\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot u"
      );
    } catch (error) {
      console.error("CommandRouter Error:", error);
      await this.lineAPI.replyMessage(replyToken, `\u25A0 \u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F

${error.toString()}

\u554F\u984C\u304C\u7D9A\u304F\u5834\u5408\u306F\u7BA1\u7406\u8005\u306B\u304A\u554F\u3044\u5408\u308F\u305B\u304F\u3060\u3055\u3044\u3002`);
    }
  }
  matchHelp(command) {
    return /^(ヘルプ|help|使い方|\?|h)$/.test(command);
  }
  matchRanking(command) {
    return /^(ランキング|順位|rank|ranking)$/.test(command);
  }
  async showHelp(replyToken) {
    const helpText = "\u3010\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot \u30B3\u30DE\u30F3\u30C9\u4E00\u89A7\u3011\n\n\u25A0 \u8A18\u9332\u7BA1\u7406\n\u3010\u624B\u52D5\u8A18\u9332\u3011\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot \u8A18\u9332 [\u540D\u524D1] [\u70B9\u65701] [\u540D\u524D2] [\u70B9\u65702] ...\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot r [\u540D\u524D1] [\u70B9\u65701] [\u540D\u524D2] [\u70B9\u65702] ...\n  \u4F8B1: @\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot r \u5C71\u7530 32000 \u9234\u6728 28000 \u4F50\u85E4 24000 \u7530\u4E2D 16000\n  \u4F8B2\uFF08\u6539\u884C\u53EF\uFF09: @\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot r\n  \u5C71\u7530 32000\n  \u9234\u6728 28000\n  \u4F50\u85E4 24000\n  \u7530\u4E2D 16000\n\n\u3010\u30E1\u30F3\u30B7\u30E7\u30F3\u8A18\u9332\u3011\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot \u8A18\u9332 @\u30E6\u30FC\u30B6\u30FC1 [\u70B9\u65701] @\u30E6\u30FC\u30B6\u30FC2 [\u70B9\u65702] ...\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot r @\u30E6\u30FC\u30B6\u30FC1 [\u70B9\u65701] @\u30E6\u30FC\u30B6\u30FC2 [\u70B9\u65702] ...\n  \u4F8B1: @\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot r @\u5C71\u7530 32000 @\u9234\u6728 28000 @\u4F50\u85E4 24000 @\u7530\u4E2D 16000\n  \u4F8B2\uFF08\u6539\u884C\u53EF\uFF09: @\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot r\n  @\u5C71\u7530 32000\n  @\u9234\u6728 28000\n  @\u4F50\u85E4 24000\n  @\u7530\u4E2D 16000\n\n\u3010\u753B\u50CF\u89E3\u6790\u8A18\u9332\u3011\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot \u753B\u50CF\u89E3\u6790\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot img\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot \u89E3\u6790\n  1. \u30B3\u30DE\u30F3\u30C9\u3092\u5B9F\u884C\n  2. 60\u79D2\u4EE5\u5185\u306B\u96C0\u9B42\u306E\u30B9\u30AF\u30EA\u30FC\u30F3\u30B7\u30E7\u30C3\u30C8\u3092\u9001\u4FE1\n  3. \u89E3\u6790\u7D50\u679C\u306E\u30DC\u30BF\u30F3\u3092\u30BF\u30C3\u30D7\u3057\u3066\u8A18\u9332\n\n\u3010\u53D6\u308A\u6D88\u3057\u3011\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot \u53D6\u6D88\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot u\n  \u76F4\u524D\u306E\u8A18\u9332\u3092\u524A\u9664\n\n\u25A0 \u7D71\u8A08\u8868\u793A\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot \u30E9\u30F3\u30AD\u30F3\u30B0\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot rank\n  \u5168\u4F53\u30E9\u30F3\u30AD\u30F3\u30B0\u3092\u8868\u793A\uFF08\u30C6\u30AD\u30B9\u30C8\u5F62\u5F0F\uFF09\n\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot \u30E9\u30F3\u30AD\u30F3\u30B0\u753B\u50CF\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot rankimg\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot ri\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot \u753B\u50CF\n  \u30E9\u30F3\u30AD\u30F3\u30B0\u306E\u753B\u50CF\u3092\u751F\u6210\n\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot \u7D71\u8A08 [\u30D7\u30EC\u30A4\u30E4\u30FC\u540D]\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot s [\u30D7\u30EC\u30A4\u30E4\u30FC\u540D]\n  \u4F8B: @\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot s \u5C71\u7530\n  \u500B\u4EBA\u306E\u8A73\u7D30\u7D71\u8A08\u3092\u8868\u793A\n\n\u25A0 \u30B7\u30FC\u30BA\u30F3\u7BA1\u7406\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot \u30B7\u30FC\u30BA\u30F3\u4F5C\u6210 [\u540D\u524D]\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot sc [\u540D\u524D]\n  \u65B0\u3057\u3044\u30B7\u30FC\u30BA\u30F3\u3092\u4F5C\u6210\n\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot \u30B7\u30FC\u30BA\u30F3\u5207\u66FF [\u30AD\u30FC]\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot sw [\u30AD\u30FC]\n  \u30B7\u30FC\u30BA\u30F3\u3092\u5207\u308A\u66FF\u3048\n\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot \u30B7\u30FC\u30BA\u30F3\u4E00\u89A7\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot sl\n  \u5168\u30B7\u30FC\u30BA\u30F3\u306E\u4E00\u89A7\u3092\u8868\u793A\n\n\u25A0 \u30D7\u30EC\u30A4\u30E4\u30FC\u7BA1\u7406\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot \u30D7\u30EC\u30A4\u30E4\u30FC\u767B\u9332 [\u540D\u524D]\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot pr [\u540D\u524D]\n  \u30D7\u30EC\u30A4\u30E4\u30FC\u3092\u767B\u9332\n\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot \u30D7\u30EC\u30A4\u30E4\u30FC\u767B\u9332 @\u30E6\u30FC\u30B6\u30FC [\u96C0\u9B42\u540D]\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot pr @\u30E6\u30FC\u30B6\u30FC [\u96C0\u9B42\u540D]\n  \u4F8B: @\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot pr @\u5C71\u7530 SHIROKUMA3\n  LINE\u30A2\u30AB\u30A6\u30F3\u30C8\u3068\u96C0\u9B42\u540D\u3092\u7D10\u4ED8\u3051\n\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot \u30D7\u30EC\u30A4\u30E4\u30FC\u4E00\u89A7\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot pl\n  \u767B\u9332\u30D7\u30EC\u30A4\u30E4\u30FC\u306E\u4E00\u89A7\u3092\u8868\u793A\n\n\u25A0 \u30D8\u30EB\u30D7\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot \u30D8\u30EB\u30D7\n@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot h\n  \u3053\u306E\u30D8\u30EB\u30D7\u3092\u8868\u793A";
    await this.lineAPI.replyMessage(replyToken, helpText);
  }
  // ========== 新規追加: メンション付きプレイヤー登録 ==========
  async handlePlayerRegisterWithMention(groupId, mentionedUser, playerName, replyToken) {
    try {
      const result = await this.playerManager.registerPlayerWithLine(
        playerName,
        mentionedUser.userId,
        mentionedUser.displayName
      );
      await this.lineAPI.replyMessage(replyToken, result.message);
      if (result.success) {
        await this.seasonManager.registerPlayer(playerName);
      }
    } catch (error) {
      console.error("handlePlayerRegisterWithMention Error:", error);
      await this.lineAPI.replyMessage(replyToken, `\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F: ${error.toString()}`);
    }
  }
  // ========== 新規追加: メンション付き記録 ==========
  async handleQuickRecordWithMentions(dataStr, groupId, userId, replyToken, mentionedUsers) {
    try {
      const seasonKey = await this.config.getCurrentSeason(groupId, this.sheets);
      if (!seasonKey) {
        await this.lineAPI.replyMessage(
          replyToken,
          "\u30B7\u30FC\u30BA\u30F3\u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002\n\u300C@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot \u30B7\u30FC\u30BA\u30F3\u4F5C\u6210 [\u540D\u524D]\u300D\u3067\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
        );
        return;
      }
      const tokens = dataStr.trim().split(/[\s\n]+/).filter((t) => t);
      const scores = [];
      for (const token of tokens) {
        const score = parseInt(token);
        if (!isNaN(score)) {
          scores.push(score);
        }
      }
      if (mentionedUsers.length < 2 || scores.length < mentionedUsers.length) {
        await this.lineAPI.replyMessage(
          replyToken,
          "\u30E1\u30F3\u30B7\u30E7\u30F3\u3068\u70B9\u6570\u306E\u6570\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002\n\u6B63\u3057\u3044\u5F62\u5F0F: @\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot \u8A18\u9332 @\u30E6\u30FC\u30B6\u30FC1 \u70B9\u65701 @\u30E6\u30FC\u30B6\u30FC2 \u70B9\u65702 ..."
        );
        return;
      }
      const players = [];
      for (let i = 0; i < mentionedUsers.length; i++) {
        const playerName = await this.playerManager.getPlayerNameByLineUserId(
          mentionedUsers[i].userId
        );
        if (!playerName) {
          await this.lineAPI.replyMessage(
            replyToken,
            `${mentionedUsers[i].displayName}\u3055\u3093\u306F\u30D7\u30EC\u30A4\u30E4\u30FC\u767B\u9332\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002
\u300C@\u9EBB\u96C0bot \u30D7\u30EC\u30A4\u30E4\u30FC\u767B\u9332 @${mentionedUsers[i].displayName} [\u96C0\u9B42\u540D]\u300D\u3067\u767B\u9332\u3057\u3066\u304F\u3060\u3055\u3044\u3002`
          );
          return;
        }
        players.push(playerName);
      }
      const gameType = players.length === 3 ? "\u4E09\u9EBB\u534A\u8358" : "\u56DB\u9EBB\u534A\u8358";
      const totalScore = scores.reduce((a, b) => a + b, 0);
      const expectedTotal = players.length === 3 ? 105e3 : 1e5;
      
      console.log("[DEBUG] Mention score validation - Players:", players.join(", "));
      console.log("[DEBUG] Mention score validation - Scores:", scores.join(", "));
      console.log("[DEBUG] Mention score validation - Total:", totalScore);
      console.log("[DEBUG] Mention score validation - Expected:", expectedTotal);
      console.log("[DEBUG] Mention score validation - Difference:", Math.abs(totalScore - expectedTotal));
      
      if (Math.abs(totalScore - expectedTotal) > 1e3) {
        await this.lineAPI.replyMessage(
          replyToken,
          `\u25A0 \u70B9\u6570\u306E\u78BA\u8A8D

\u5165\u529B\u3055\u308C\u305F\u5408\u8A08: ${totalScore.toLocaleString()}\u70B9
\u6B63\u3057\u3044\u5408\u8A08: ${expectedTotal.toLocaleString()}\u70B9 (${gameType})
\u5DEE\u5206: ${(totalScore - expectedTotal).toLocaleString()}\u70B9

\u5404\u30D7\u30EC\u30A4\u30E4\u30FC\u306E\u70B9\u6570:
${players.map((p, i) => `${p}: ${scores[i].toLocaleString()}\u70B9`).join('\n')}

\u70B9\u6570\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002`
        );
        return;
      }
      const result = await this.spreadsheetManager.addGameRecord(seasonKey, {
        gameType,
        players,
        scores,
        userId
      });
      if (result.success) {
        let message = "\u25A0 \u8A18\u9332\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F\n\n";
        message += `\u3010\u5BFE\u6226\u7D50\u679C\u3011 ${gameType}
`;
        const sortedResults = [];
        for (let i = 0; i < players.length; i++) {
          const rank = this.calculator.calculateRank(scores[i], scores);
          const gameScore = this.calculator.calculateGameScore(
            scores[i],
            gameType,
            rank,
            players.length
          );
          sortedResults.push({
            name: players[i],
            score: scores[i],
            rank,
            gameScore
          });
        }
        sortedResults.sort((a, b) => a.rank - b.rank);
        sortedResults.forEach((r) => {
          const sign = r.gameScore >= 0 ? "+" : "";
          message += `${r.rank}\u4F4D ${r.name}: ${r.score.toLocaleString()}\u70B9 (${sign}${r.gameScore.toFixed(1)}pt)
`;
        });
        await this.lineAPI.replyMessage(replyToken, message);
        setTimeout(async () => {
          await this.handleRanking(groupId, null, true);
        }, 1e3);
      } else {
        await this.lineAPI.replyMessage(replyToken, `\u25A0 \u8A18\u9332\u306E\u8FFD\u52A0\u306B\u5931\u6557\u3057\u307E\u3057\u305F

${result.error}`);
      }
    } catch (error) {
      console.error("handleQuickRecordWithMentions Error:", error);
      await this.lineAPI.replyMessage(replyToken, `\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F: ${error.toString()}`);
    }
  }
  async handleQuickRecord(dataStr, groupId, userId, replyToken) {
    const seasonKey = await this.config.getCurrentSeason(groupId, this.sheets);
    if (!seasonKey) {
      await this.lineAPI.replyMessage(
        replyToken,
        "\u30B7\u30FC\u30BA\u30F3\u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002\n\u300C@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot \u30B7\u30FC\u30BA\u30F3\u4F5C\u6210 [\u540D\u524D]\u300D\u3067\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
      );
      return;
    }
    const tokens = dataStr.trim().split(/[\s\n]+/).filter((t) => t);
    if (tokens.length < 4 || tokens.length % 2 !== 0) {
      await this.lineAPI.replyMessage(
        replyToken,
        "\u5F62\u5F0F\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002\n\u6B63\u3057\u3044\u5F62\u5F0F: @\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot \u8A18\u9332 \u540D\u524D1 \u70B9\u65701 \u540D\u524D2 \u70B9\u65702 ..."
      );
      return;
    }
    const players = [];
    const scores = [];
    for (let i = 0; i < tokens.length; i += 2) {
      players.push(tokens[i]);
      const score = parseInt(tokens[i + 1]);
      if (isNaN(score)) {
        await this.lineAPI.replyMessage(replyToken, `\u70B9\u6570\u304C\u4E0D\u6B63\u3067\u3059: ${tokens[i + 1]}`);
        return;
      }
      scores.push(score);
    }
    const gameType = players.length === 3 ? "\u4E09\u9EBB\u534A\u8358" : "\u56DB\u9EBB\u534A\u8358";
    const totalScore = scores.reduce((a, b) => a + b, 0);
    const expectedTotal = players.length === 3 ? 105e3 : 1e5;
    
    console.log("[DEBUG] Score validation - Players:", players.join(", "));
    console.log("[DEBUG] Score validation - Scores:", scores.join(", "));
    console.log("[DEBUG] Score validation - Total:", totalScore);
    console.log("[DEBUG] Score validation - Expected:", expectedTotal);
    console.log("[DEBUG] Score validation - Difference:", Math.abs(totalScore - expectedTotal));
    
    if (Math.abs(totalScore - expectedTotal) > 1e3) {
      await this.lineAPI.replyMessage(
        replyToken,
        `\u25A0 \u70B9\u6570\u306E\u78BA\u8A8D

\u5165\u529B\u3055\u308C\u305F\u5408\u8A08: ${totalScore.toLocaleString()}\u70B9
\u6B63\u3057\u3044\u5408\u8A08: ${expectedTotal.toLocaleString()}\u70B9 (${gameType})
\u5DEE\u5206: ${(totalScore - expectedTotal).toLocaleString()}\u70B9

\u5404\u30D7\u30EC\u30A4\u30E4\u30FC\u306E\u70B9\u6570:
${players.map((p, i) => `${p}: ${scores[i].toLocaleString()}\u70B9`).join('\n')}

\u70B9\u6570\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002`
      );
      return;
    }
    const result = await this.spreadsheetManager.addGameRecord(seasonKey, {
      gameType,
      players,
      scores,
      userId
    });
    if (result.success) {
      let message = "\u25A0 \u8A18\u9332\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F\n\n";
      message += `\u3010\u5BFE\u6226\u7D50\u679C\u3011 ${gameType}
`;
      const sortedResults = [];
      for (let i = 0; i < players.length; i++) {
        const rank = this.calculator.calculateRank(scores[i], scores);
        const gameScore = this.calculator.calculateGameScore(
          scores[i],
          gameType,
          rank,
          players.length
        );
        sortedResults.push({
          name: players[i],
          score: scores[i],
          rank,
          gameScore
        });
      }
      sortedResults.sort((a, b) => a.rank - b.rank);
      sortedResults.forEach((r) => {
        const sign = r.gameScore >= 0 ? "+" : "";
        message += `${r.rank}\u4F4D ${r.name}: ${r.score.toLocaleString()}\u70B9 (${sign}${r.gameScore.toFixed(1)}pt)
`;
      });
      await this.lineAPI.replyMessage(replyToken, message);
      setTimeout(async () => {
        await this.handleRanking(groupId, null, true);
      }, 1e3);
    } else {
      await this.lineAPI.replyMessage(replyToken, `\u25A0 \u8A18\u9332\u306E\u8FFD\u52A0\u306B\u5931\u6557\u3057\u307E\u3057\u305F

${result.error}`);
    }
  }
  async handleUndo(groupId, replyToken) {
    const seasonKey = await this.config.getCurrentSeason(groupId, this.sheets);
    if (!seasonKey) {
      await this.lineAPI.replyMessage(replyToken, "\u30B7\u30FC\u30BA\u30F3\u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002");
      return;
    }
    const result = await this.spreadsheetManager.deleteLastRecord(seasonKey);
    if (result.success) {
      await this.lineAPI.replyMessage(
        replyToken,
        `\u25A0 \u76F4\u524D\u306E\u8A18\u9332\u3092\u524A\u9664\u3057\u307E\u3057\u305F

\u524A\u9664\u5185\u5BB9:
${result.deletedRecord}`
      );
    } else {
      await this.lineAPI.replyMessage(replyToken, `\u25A0 \u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F

${result.error}`);
    }
  }
  async handleRanking(groupId, replyToken, isPush = false) {
    const seasonKey = await this.config.getCurrentSeason(groupId, this.sheets);
    if (!seasonKey) {
      const msg = "\u30B7\u30FC\u30BA\u30F3\u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002";
      if (isPush) {
        await this.lineAPI.pushMessage(groupId, msg);
      } else {
        await this.lineAPI.replyMessage(replyToken, msg);
      }
      return;
    }
    const records = await this.spreadsheetManager.getAllRecords(seasonKey);
    if (!records || records.length === 0) {
      const msg = "\u307E\u3060\u8A18\u9332\u304C\u3042\u308A\u307E\u305B\u3093\u3002";
      if (isPush) {
        await this.lineAPI.pushMessage(groupId, msg);
      } else {
        await this.lineAPI.replyMessage(replyToken, msg);
      }
      return;
    }
    const stats = this.playerManager.calculateStatistics(records);
    const top10 = stats.slice(0, 10);
    let message = `\u25A0 \u30E9\u30F3\u30AD\u30F3\u30B0 - ${seasonKey}

`;
    top10.forEach((player, index) => {
      const rank = index + 1;
      const sign = player.totalScore >= 0 ? "+" : "";
      message += `${rank}\u4F4D ${player.name}
`;
      message += `  ${sign}${player.totalScore.toFixed(1)}pt (${player.totalGames}\u6226)
`;
      message += `  1\u4F4D\u7387: ${player.winRate.toFixed(1)}% | `;
      message += `\u5E73\u5747\u9806\u4F4D: ${player.avgRank.toFixed(2)}\u4F4D

`;
    });
    if (isPush) {
      await this.lineAPI.pushMessage(groupId, message);
    } else {
      await this.lineAPI.replyMessage(replyToken, message);
    }
  }
  async handleRankingImage(groupId, replyToken, isPush = false, ctx = null) {
    const seasonKey = await this.config.getCurrentSeason(groupId, this.sheets);
    if (!seasonKey) {
      const msg = "\u30B7\u30FC\u30BA\u30F3\u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002";
      if (isPush) {
        await this.lineAPI.pushMessage(groupId, msg);
      } else {
        await this.lineAPI.replyMessage(replyToken, msg);
      }
      return;
    }
    const records = await this.spreadsheetManager.getAllRecords(seasonKey);
    if (!records || records.length === 0) {
      const msg = "\u307E\u3060\u8A18\u9332\u304C\u3042\u308A\u307E\u305B\u3093\u3002";
      if (isPush) {
        await this.lineAPI.pushMessage(groupId, msg);
      } else {
        await this.lineAPI.replyMessage(replyToken, msg);
      }
      return;
    }
    const stats = this.playerManager.calculateStatistics(records);
    const top10 = stats.slice(0, 10);
    const processingMsg = "\u25A0 \u30E9\u30F3\u30AD\u30F3\u30B0\u753B\u50CF\u3092\u751F\u6210\u4E2D...\n\n\u3057\u3070\u3089\u304F\u304A\u5F85\u3061\u304F\u3060\u3055\u3044\u3002";
    if (isPush) {
      await this.lineAPI.pushMessage(groupId, processingMsg);
    } else {
      await this.lineAPI.replyMessage(replyToken, processingMsg);
    }
    if (this.rankingImageGenerator && ctx) {
      ctx.waitUntil(
        this.generateAndSendImage(groupId, seasonKey, top10, records.length).catch((error) => {
          console.error("[ERROR] Background image generation failed:", error);
        })
      );
    } else if (!this.rankingImageGenerator) {
      await this.lineAPI.pushMessage(groupId, "\u25A0 \u753B\u50CF\u751F\u6210\u6A5F\u80FD\u304C\u5229\u7528\u3067\u304D\u307E\u305B\u3093");
    } else if (!ctx) {
      console.error("[ERROR] ctx is null, cannot use waitUntil for background processing");
      await this.lineAPI.pushMessage(groupId, "\u25A0 \u753B\u50CF\u751F\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F\n\n\u30B7\u30B9\u30C6\u30E0\u30A8\u30E9\u30FC");
    }
  }
  // 画像生成とメッセージ送信を行う別メソッド（非同期バックグラウンド処理用）
  async generateAndSendImage(groupId, seasonKey, top10, totalGames) {
    try {
      console.log("[INFO] Generating ranking image...");
      const currentDate = (/* @__PURE__ */ new Date()).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      const rankingData = {
        top10,
        totalGames,
        currentDate
      };
      const imageResult = await this.rankingImageGenerator.generateImage(rankingData, seasonKey);
      if (imageResult.success && imageResult.imageUrl) {
        console.log("[INFO] Sending ranking image");
        await this.lineAPI.pushImage(groupId, imageResult.imageUrl);
      } else {
        console.log("[WARN] Image generation failed:", imageResult.error);
        await this.lineAPI.pushMessage(groupId, `\u25A0 \u753B\u50CF\u751F\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F

${imageResult.error}`);
      }
    } catch (error) {
      console.error("[ERROR] Failed to generate/send ranking image:", error);
      await this.lineAPI.pushMessage(groupId, `\u25A0 \u753B\u50CF\u751F\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F

\u30A8\u30E9\u30FC: ${error.message}`);
    }
  }
  // 画像解析リクエスト
  async handleImageAnalysisRequest(groupId, replyToken) {
    console.log("[DEBUG] handleImageAnalysisRequest called - GroupId:", groupId);
    console.log("[DEBUG] messageHandler exists:", !!this.messageHandler);
    
    // 画像解析モードを有効化（60秒間有効）
    if (this.messageHandler) {
      const timestamp = Date.now();
      
      // KVに保存（複数インスタンス対応）
      if (this.messageHandler.kv) {
        const kvKey = `image_analysis_mode:${groupId}`;
        await this.messageHandler.kv.put(kvKey, timestamp.toString(), { expirationTtl: 60 });
        console.log("[INFO] Image analysis mode saved to KV - Key:", kvKey, "Timestamp:", timestamp);
        
        // 検証: KVから読み取り
        const verification = await this.messageHandler.kv.get(kvKey);
        console.log("[INFO] Verification - KV value:", verification);
      } else {
        // フォールバック: メモリに保存
        this.messageHandler.lastMentionTime.set(groupId, timestamp);
        console.log("[INFO] Image analysis mode saved to memory - Timestamp:", timestamp);
      }
      
      await this.lineAPI.replyMessage(
        replyToken,
        "■ 画像解析モード\n\n60秒以内に雀魂のスクリーンショットを送信してください。\n解析結果が表示され、ボタンをタップすると記録できます。"
      );
    } else {
      console.error("[ERROR] messageHandler is not available!");
      await this.lineAPI.replyMessage(
        replyToken,
        "■ エラー\n\n画像解析機能が利用できません。管理者に連絡してください。"
      );
    }
  }
  async handleStats(groupId, playerName, replyToken) {
    const seasonKey = await this.config.getCurrentSeason(groupId, this.sheets);
    if (!seasonKey) {
      await this.lineAPI.replyMessage(replyToken, "\u30B7\u30FC\u30BA\u30F3\u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002");
      return;
    }
    if (!playerName) {
      await this.lineAPI.replyMessage(
        replyToken,
        "\u30D7\u30EC\u30A4\u30E4\u30FC\u540D\u3092\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n\u4F8B: @\u9EBB\u96C0bot \u7D71\u8A08 \u5C71\u7530"
      );
      return;
    }
    const records = await this.spreadsheetManager.getAllRecords(seasonKey);
    const stats = this.playerManager.calculateStatistics(records);
    const playerStats = stats.find((s) => s.name === playerName);
    if (!playerStats) {
      await this.lineAPI.replyMessage(replyToken, `${playerName}\u3055\u3093\u306E\u8A18\u9332\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002`);
      return;
    }
    const sign = playerStats.totalScore >= 0 ? "+" : "";
    let rankDistText = "";
    for (let rank = 1; rank <= 4; rank++) {
      const count = playerStats.rankDist[rank] || 0;
      if (count > 0) {
        const rate = (count / playerStats.totalGames * 100).toFixed(1);
        rankDistText += `${rank}\u4F4D: ${count}\u56DE (${rate}%)
`;
      }
    }
    const message = `\u3010${playerName}\u3055\u3093\u306E\u7D71\u8A08\u3011

\u25A0\u7DCF\u5408\u6210\u7E3E
\u7DCF\u5BFE\u6226\u6570: ${playerStats.totalGames}\u6226
\u5408\u8A08\u30B9\u30B3\u30A2: ${sign}${playerStats.totalScore.toFixed(1)}pt
\u5E73\u5747\u30B9\u30B3\u30A2: ${sign}${playerStats.avgScore.toFixed(2)}pt/\u6226
\u5E73\u5747\u9806\u4F4D: ${playerStats.avgRank.toFixed(2)}\u4F4D

\u25A0\u9806\u4F4D\u5206\u5E03
` + rankDistText + `
\u25A0\u70B9\u6570
\u6700\u9AD8\u70B9\u68D2: ${playerStats.maxScore.toLocaleString()}\u70B9
\u6700\u4F4E\u70B9\u68D2: ${playerStats.minScore.toLocaleString()}\u70B9
\u5E73\u5747\u70B9\u68D2: ${playerStats.avgRawScore.toFixed(0)}\u70B9`;
    await this.lineAPI.replyMessage(replyToken, message);
  }
  async handleSeasonCreate(groupId, seasonName, replyToken) {
    const result = await this.seasonManager.createSeason(groupId, seasonName);
    if (result.success) {
      await this.lineAPI.replyMessage(
        replyToken,
        `\u30B7\u30FC\u30BA\u30F3\u300C${seasonName}\u300D\u3092\u4F5C\u6210\u3057\u307E\u3057\u305F\u3002
\u30B7\u30FC\u30BA\u30F3\u30AD\u30FC: ${result.seasonKey}`
      );
    } else {
      await this.lineAPI.replyMessage(replyToken, `\u25A0 \u30B7\u30FC\u30BA\u30F3\u306E\u4F5C\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F

${result.error}`);
    }
  }
  async handleSeasonSwitch(groupId, seasonKey, replyToken) {
    await this.config.setCurrentSeason(groupId, seasonKey);
    await this.lineAPI.replyMessage(replyToken, `\u30B7\u30FC\u30BA\u30F3\u3092\u300C${seasonKey}\u300D\u306B\u5207\u308A\u66FF\u3048\u307E\u3057\u305F\u3002`);
  }
  async handleSeasonList(groupId, replyToken) {
    const seasons = await this.seasonManager.getAllSeasons();
    const currentSeason = await this.config.getCurrentSeason(groupId, this.sheets);
    if (seasons.length === 0) {
      await this.lineAPI.replyMessage(
        replyToken,
        "\u30B7\u30FC\u30BA\u30F3\u304C\u3042\u308A\u307E\u305B\u3093\u3002\n\u300C@\u9EBB\u96C0bot \u30B7\u30FC\u30BA\u30F3\u4F5C\u6210 [\u540D\u524D]\u300D\u3067\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
      );
      return;
    }
    let message = "\u3010\u30B7\u30FC\u30BA\u30F3\u4E00\u89A7\u3011\n\n";
    seasons.forEach((season) => {
      const current = season.key === currentSeason ? " (\u73FE\u5728)" : "";
      message += `${season.name} [${season.key}]${current}
`;
    });
    message += "\n\u5207\u308A\u66FF\u3048: @\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot \u30B7\u30FC\u30BA\u30F3\u5207\u66FF [\u30B7\u30FC\u30BA\u30F3\u30AD\u30FC]";
    await this.lineAPI.replyMessage(replyToken, message);
  }
  async handlePlayerRegister(groupId, playerName, replyToken) {
    const result = await this.seasonManager.registerPlayer(playerName);
    if (result.success) {
      await this.lineAPI.replyMessage(replyToken, `\u30D7\u30EC\u30A4\u30E4\u30FC\u300C${playerName}\u300D\u3092\u767B\u9332\u3057\u307E\u3057\u305F\u3002`);
    } else {
      await this.lineAPI.replyMessage(replyToken, `\u25A0 \u30D7\u30EC\u30A4\u30E4\u30FC\u306E\u767B\u9332\u306B\u5931\u6557\u3057\u307E\u3057\u305F

${result.error}`);
    }
  }
  async handlePlayerList(groupId, replyToken) {
    const players = await this.seasonManager.getAllPlayers();
    if (players.length === 0) {
      await this.lineAPI.replyMessage(replyToken, "\u30D7\u30EC\u30A4\u30E4\u30FC\u304C\u767B\u9332\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002");
      return;
    }
    let message = `\u3010\u767B\u9332\u30D7\u30EC\u30A4\u30E4\u30FC\u4E00\u89A7\u3011(${players.length}\u540D)

`;
    players.forEach((player, index) => {
      message += `${index + 1}. ${player}
`;
    });
    await this.lineAPI.replyMessage(replyToken, message);
  }
};
__name(CommandRouter, "CommandRouter");

// src/ranking-image-generator.js
var RankingImageGenerator = class {
  constructor(config, envBinding, kvBinding) {
    this.config = config;
    this.env = envBinding;
    this.kv = kvBinding;
  }
  // 現在の季節を判定
  getCurrentSeason() {
    const month = (/* @__PURE__ */ new Date()).getMonth() + 1;
    if (month >= 3 && month <= 5)
      return "spring";
    if (month >= 6 && month <= 8)
      return "summer";
    if (month >= 9 && month <= 11)
      return "autumn";
    return "winter";
  }
  // 季節ごとの色設定
  getSeasonalColors(season) {
    const colors = {
      spring: {
        primary: "#FFB7C5",
        // 桜ピンク
        secondary: "#FFF0F5",
        // 薄いピンク
        accent: "#FF69B4",
        // ホットピンク
        background: "#FFF5EE"
        // シーシェル
      },
      summer: {
        primary: "#87CEEB",
        // スカイブルー
        secondary: "#E0F6FF",
        // 薄い水色
        accent: "#4169E1",
        // ロイヤルブルー
        background: "#F0F8FF"
        // アリスブルー
      },
      autumn: {
        primary: "#FF8C00",
        // ダークオレンジ
        secondary: "#FFE4B5",
        // モカシン
        accent: "#D2691E",
        // チョコレート
        background: "#FFF8DC"
        // コーンシルク
      },
      winter: {
        primary: "#B0E0E6",
        // パウダーブルー
        secondary: "#F0FFFF",
        // アズール
        accent: "#4682B4",
        // スチールブルー
        background: "#F8F8FF"
        // ゴーストホワイト
      }
    };
    return colors[season];
  }
  // 順位に応じたメダル色を取得
  getMedalColor(rank) {
    if (rank === 1)
      return "#FFD700";
    if (rank === 2)
      return "#C0C0C0";
    if (rank === 3)
      return "#CD7F32";
    return "#808080";
  }
  // Canvas APIでランキング画像を生成（SVG形式）
  generateImageSVG(rankingData, seasonKey) {
    const { top10, totalGames, currentDate } = rankingData;
    const season = this.getCurrentSeason();
    const colors = this.getSeasonalColors(season);
    const topPlayers = top10.slice(0, 5);
    const width = 800;
    const height = 1e3;
    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.background};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${colors.secondary};stop-opacity:1" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- \u80CC\u666F -->
  <rect width="${width}" height="${height}" fill="url(#bgGradient)"/>
  
  <!-- \u88C5\u98FE\u7684\u306A\u30DC\u30FC\u30C0\u30FC -->
  <rect x="20" y="20" width="${width - 40}" height="${height - 40}" 
        fill="none" stroke="${colors.primary}" stroke-width="4" rx="15"/>
  
  <!-- \u30BF\u30A4\u30C8\u30EB\u30A8\u30EA\u30A2 -->
  <rect x="40" y="40" width="${width - 80}" height="150" 
        fill="${colors.primary}" opacity="0.9" rx="10" filter="url(#shadow)"/>
  
  <!-- \u30BF\u30A4\u30C8\u30EB\u30C6\u30AD\u30B9\u30C8 -->
  <text x="${width / 2}" y="100" 
        font-family="Arial, sans-serif" font-size="40" font-weight="bold" 
        fill="#333" text-anchor="middle">
    \u9EBB\u96C0\u30E9\u30F3\u30AD\u30F3\u30B0
  </text>
  <text x="${width / 2}" y="140" 
        font-family="Arial, sans-serif" font-size="24" font-weight="bold" 
        fill="#555" text-anchor="middle">
    ${seasonKey}
  </text>
  <text x="${width / 2}" y="170" 
        font-family="Arial, sans-serif" font-size="16" 
        fill="#666" text-anchor="middle">
    ${currentDate} | ${totalGames}\u6226
  </text>
`;
    let y = 240;
    topPlayers.forEach((player, index) => {
      const rank = index + 1;
      const sign = player.totalScore >= 0 ? "+" : "";
      const medalColor = this.getMedalColor(rank);
      const bgOpacity = rank <= 3 ? 0.3 : 0.15;
      svg += `
  <!-- \u9806\u4F4D ${rank} -->
  <rect x="60" y="${y}" width="${width - 120}" height="120" 
        fill="${colors.accent}" opacity="${bgOpacity}" rx="8"/>
  
  <!-- \u30E1\u30C0\u30EB\u5186 -->
  <circle cx="110" cy="${y + 60}" r="35" 
          fill="${medalColor}" opacity="0.9" filter="url(#shadow)"/>
  <text x="110" y="${y + 70}" 
        font-family="Arial, sans-serif" font-size="32" font-weight="bold" 
        fill="white" text-anchor="middle">
    ${rank}
  </text>
  
  <!-- \u30D7\u30EC\u30A4\u30E4\u30FC\u540D -->
  <text x="170" y="${y + 45}" 
        font-family="Arial, sans-serif" font-size="28" font-weight="bold" 
        fill="#333">
    ${player.name}
  </text>
  
  <!-- \u30DD\u30A4\u30F3\u30C8 -->
  <text x="170" y="${y + 80}" 
        font-family="Arial, sans-serif" font-size="22" 
        fill="${player.totalScore >= 0 ? "#2E8B57" : "#DC143C"}" font-weight="bold">
    ${sign}${player.totalScore.toFixed(1)}pt
  </text>
  
  <!-- \u8A66\u5408\u6570\u3068\u7D71\u8A08 -->
  <text x="170" y="${y + 105}" 
        font-family="Arial, sans-serif" font-size="16" 
        fill="#666">
    ${player.totalGames}\u6226 | 1\u4F4D\u7387: ${player.winRate.toFixed(1)}% | \u5E73\u5747: ${player.avgRank.toFixed(2)}\u4F4D
  </text>
`;
      y += 140;
    });
    svg += `
  <!-- \u30D5\u30C3\u30BF\u30FC -->
  <text x="${width / 2}" y="${height - 30}" 
        font-family="Arial, sans-serif" font-size="14" 
        fill="#999" text-anchor="middle">
    @\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot
  </text>
</svg>`;
    return svg;
  }
  // 完全なHTMLページを生成
  generateCompleteHTML(rankingData, seasonKey) {
    const { top10, totalGames, currentDate } = rankingData;
    const season = this.getCurrentSeason();
    const colors = this.getSeasonalColors(season);
    const topPlayers = top10.slice(0, 5);
    const playerRows = topPlayers.map((player, index) => {
      const rank = index + 1;
      const sign = player.totalScore >= 0 ? "+" : "";
      const medalColor = this.getMedalColor(rank);
      const bgOpacity = rank <= 3 ? "4D" : "26";
      const backgroundColor = `${colors.accent}${bgOpacity}`;
      return `
        <div style="display: flex; align-items: center; padding: 20px; margin-bottom: 20px; 
                    border-radius: 8px; min-height: 120px; background-color: ${backgroundColor};">
          <div style="width: 70px; height: 70px; border-radius: 50%; display: flex; 
                      align-items: center; justify-content: center; font-size: 32px; 
                      font-weight: bold; color: white; margin-right: 30px; 
                      background-color: ${medalColor}; box-shadow: 2px 2px 6px rgba(0,0,0,0.3);">
            ${rank}
          </div>
          <div style="flex: 1;">
            <div style="font-size: 28px; font-weight: bold; color: #333; margin-bottom: 8px;">
              ${player.name}
            </div>
            <div style="font-size: 22px; font-weight: bold; margin-bottom: 5px; 
                        color: ${player.totalScore >= 0 ? "#2E8B57" : "#DC143C"};">
              ${sign}${player.totalScore.toFixed(1)}pt
            </div>
            <div style="font-size: 16px; color: #666;">
              ${player.totalGames}\u6226 | 1\u4F4D\u7387: ${player.winRate.toFixed(1)}% | \u5E73\u5747: ${player.avgRank.toFixed(2)}\u4F4D
            </div>
          </div>
        </div>
      `;
    }).join("");
    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=800, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 800px;
      min-height: 1100px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', 
                   'Hiragino Sans', 'Hiragino Kaku Gothic ProN', Arial, sans-serif;
      background: linear-gradient(180deg, ${colors.background} 0%, ${colors.secondary} 100%);
      padding: 20px;
    }
    .container {
      width: 100%;
      min-height: 1060px;
      border: 4px solid ${colors.primary};
      border-radius: 15px;
      padding: 20px;
      display: flex;
      flex-direction: column;
    }
    .header {
      background-color: ${colors.primary};
      border-radius: 10px;
      padding: 30px 20px;
      text-align: center;
      margin-bottom: 30px;
      box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.2);
    }
    .title {
      font-size: 40px;
      font-weight: bold;
      color: #333;
      margin-bottom: 10px;
    }
    .season {
      font-size: 24px;
      font-weight: bold;
      color: #555;
      margin-bottom: 5px;
    }
    .date-info {
      font-size: 16px;
      color: #666;
    }
    .players {
      flex: 1;
    }
    .footer {
      margin-top: 30px;
      padding: 20px 0;
      text-align: center;
      font-size: 14px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">\u9EBB\u96C0\u30E9\u30F3\u30AD\u30F3\u30B0</div>
      <div class="season">${seasonKey}</div>
      <div class="date-info">${currentDate} | ${totalGames}\u6226</div>
    </div>
    <div class="players">
      ${playerRows}
    </div>
    <div class="footer">@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot</div>
  </div>
</body>
</html>`;
  }
  // HTMLをPNGに変換
  async convertHtmlToPng(html, rankingData, seasonKey) {
    console.log("[INFO] Converting HTML to PNG...");
    const hasHCTI = this.env?.HCTI_API_USER_ID && this.env?.HCTI_API_KEY;
    const hasAbstract = this.env?.ABSTRACT_API_KEY;
    console.log("[DEBUG] Environment variables check:");
    console.log("  HCTI_API_USER_ID:", this.env?.HCTI_API_USER_ID ? "SET" : "NOT SET");
    console.log("  HCTI_API_KEY:", this.env?.HCTI_API_KEY ? "SET" : "NOT SET");
    console.log("  ABSTRACT_API_KEY:", this.env?.ABSTRACT_API_KEY ? "SET" : "NOT SET");
    if (hasHCTI) {
      try {
        console.log("[INFO] Trying htmlcsstoimage.com API...");
        const auth = btoa(`${this.env.HCTI_API_USER_ID}:${this.env.HCTI_API_KEY}`);
        const response = await fetch("https://hcti.io/v1/image", {
          method: "POST",
          headers: {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            html,
            viewport_width: 800,
            viewport_height: 1100,
            device_scale: 2
          })
        });
        console.log("[DEBUG] HCTI API response status:", response.status);
        if (response.ok) {
          const data = await response.json();
          console.log("[INFO] HCTI API returned URL:", data.url);
          const imageResponse = await fetch(data.url);
          if (imageResponse.ok) {
            const buffer = await imageResponse.arrayBuffer();
            console.log("[INFO] HCTI conversion successful, size:", buffer.byteLength, "bytes");
            return { success: true, buffer, method: "hcti" };
          } else {
            console.warn("[WARN] Failed to download image from HCTI:", imageResponse.status);
          }
        } else {
          const errorText = await response.text();
          console.warn("[WARN] HCTI API failed:", response.status, errorText);
        }
      } catch (error) {
        console.error("[ERROR] HCTI API exception:", error.message);
      }
    } else {
      console.warn("[WARN] HCTI API credentials not found, skipping...");
    }
    if (hasAbstract) {
      try {
        console.log("[INFO] Trying AbstractAPI...");
        const tempKey = `temp/${Date.now()}.html`;
        await this.kv.put(tempKey, html, { expirationTtl: 300 });
        const tempUrl = `https://mahjong-line-bot.ogaiku.workers.dev/temp/${tempKey}`;
        const response = await fetch(
          `https://screenshot.abstractapi.com/v1/?api_key=${this.env.ABSTRACT_API_KEY}&url=${encodeURIComponent(tempUrl)}&width=800&height=1000`
        );
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          await this.kv.delete(tempKey);
          console.log("[INFO] AbstractAPI conversion successful");
          return { success: true, buffer, method: "abstract" };
        }
      } catch (error) {
        console.warn("[WARN] AbstractAPI failed:", error.message);
      }
    }
    console.log("[WARN] All PNG conversion methods failed, using SVG fallback");
    const svgContent = this.generateImageSVG(rankingData, seasonKey);
    return {
      success: true,
      svg: svgContent,
      method: "svg-fallback"
    };
  }
  // ランキング画像を生成（PNG対応版）
  async generateImage(rankingData, seasonKey) {
    try {
      console.log("[INFO] Generating ranking image (PNG format)");
      console.log("[DEBUG] Environment object:", this.env ? "available" : "NOT available");
      const html = this.generateCompleteHTML(rankingData, seasonKey);
      console.log("[INFO] HTML generated, length:", html.length);
      const conversionResult = await this.convertHtmlToPng(html, rankingData, seasonKey);
      if (!conversionResult.success) {
        throw new Error("PNG conversion failed");
      }
      console.log(`[INFO] Conversion method: ${conversionResult.method}`);
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const imageKey = `rankings/${timestamp}-${random}.png`;
      let imageData;
      let contentType = "image/png";
      if (conversionResult.buffer) {
        const uint8Array = new Uint8Array(conversionResult.buffer);
        let binary = "";
        const chunkSize = 8192;
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
          binary += String.fromCharCode.apply(null, chunk);
        }
        const base64 = btoa(binary);
        imageData = base64;
        contentType = "image/png";
        console.log("[INFO] PNG image prepared, size:", conversionResult.buffer.byteLength, "bytes");
      } else if (conversionResult.svg) {
        imageData = btoa(unescape(encodeURIComponent(conversionResult.svg)));
        contentType = "image/svg+xml";
        console.log("[WARN] Using SVG fallback (PNG conversion failed)");
      } else {
        throw new Error("No valid image data");
      }
      console.log("[INFO] Storing in KV...");
      await this.kv.put(imageKey, imageData, {
        expirationTtl: 86400,
        metadata: {
          contentType,
          method: conversionResult.method,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
      const publicUrl = `https://mahjong-line-bot.ogaiku.workers.dev/images/${imageKey}`;
      console.log("[INFO] Image generation successful");
      console.log("[INFO] Public URL:", publicUrl);
      console.log("[INFO] Format:", contentType.includes("png") ? "PNG" : "SVG");
      return {
        success: true,
        imageUrl: publicUrl,
        imageKey,
        format: contentType.includes("png") ? "png" : "svg",
        method: conversionResult.method
      };
    } catch (error) {
      console.error("[ERROR] Image generation failed:", error);
      console.error("[ERROR] Error stack:", error.stack);
      return {
        success: false,
        error: error.message
      };
    }
  }
};
__name(RankingImageGenerator, "RankingImageGenerator");

// src/index.js
async function handleLineWebhook(request, env, ctx) {
  const config = new Config(env);
  const sheetsClient = new GoogleSheetsClient(config);
  const lineAPI = new LineAPI(config);
  const scoreCalculator = new ScoreCalculator(config);
  const spreadsheetManager = new SpreadsheetManager(sheetsClient, config);
  const playerManager = new PlayerManager(scoreCalculator, sheetsClient, config);
  const seasonManager = new SeasonManager(sheetsClient, config);
  const imageAnalyzer = new ImageAnalyzer(config, sheetsClient);
  const messageHandler = new MessageHandler(lineAPI, imageAnalyzer, env.IMAGES);
  const rankingImageGenerator = env.IMAGES ? new RankingImageGenerator(config, env, env.IMAGES) : null;
  const commandRouter = new CommandRouter(
    config,
    lineAPI,
    spreadsheetManager,
    playerManager,
    seasonManager,
    scoreCalculator,
    sheetsClient,
    rankingImageGenerator,
    messageHandler
  );
  const body = await request.json();
  for (const event of body.events) {
    if (event.type === "message") {
      if (event.message.type === "text") {
        await messageHandler.handleTextMessage(event, commandRouter, ctx);
      } else if (event.message.type === "image") {
        await messageHandler.handleImageMessage(event, ctx);
      }
    } else if (event.type === "join") {
      const groupId = event.source.groupId;
      const welcomeMessage = "\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot\u3067\u3059\u3002\n\n\u4F7F\u3044\u65B9: @\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot \u30D8\u30EB\u30D7\n\u6700\u521D\u306B\u300C@\u9EBB\u96C0\u70B9\u6570\u7BA1\u7406bot \u30B7\u30FC\u30BA\u30F3\u4F5C\u6210 [\u30B7\u30FC\u30BA\u30F3\u540D]\u300D\u3092\u5B9F\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
      await lineAPI.pushMessage(groupId, welcomeMessage);
    }
  }
  return new Response(JSON.stringify({ status: "success" }), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleLineWebhook, "handleLineWebhook");
var src_default = {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }
    if (request.method === "GET") {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/images/")) {
        const imageKey = url.pathname.substring(8);
        try {
          const { value: base64Image, metadata } = await env.IMAGES.getWithMetadata(imageKey);
          if (!base64Image) {
            return new Response("Image not found", { status: 404 });
          }
          const contentType = metadata?.contentType || "image/png";
          const binaryString = atob(base64Image);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          return new Response(bytes, {
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=3600",
              "Access-Control-Allow-Origin": "*"
            }
          });
        } catch (error) {
          console.error("[ERROR] Failed to fetch image from KV:", error);
          return new Response("Error fetching image", { status: 500 });
        }
      }
      return new Response(JSON.stringify({ status: "ok", message: "Mahjong LINE Bot is running" }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    if (request.method === "POST") {
      try {
        const response = await handleLineWebhook(request, env, ctx);
        response.headers.set("Access-Control-Allow-Origin", "*");
        return response;
      } catch (error) {
        console.error("Error:", error);
        return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
    }
    return new Response("Method not allowed", { status: 405 });
  }
};
export {
  src_default as default
};
//# sourceMappingURL=index.js.map

