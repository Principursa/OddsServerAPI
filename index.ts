import axios, { AxiosResponse } from "axios";
import express, { Express, Request, response, Response } from "express";
import dotenv from "dotenv";
import { stringify } from "flatted";
//TODO: Three different Routes, one for getting list of all games, one for odds for spec game:
//NOTE: for the contract it should only be necessary to get specific games, frontend can handle listing
// all available  games

dotenv.config();
const apiKey = process.env.API_KEY;
const app = express();
const port = 3000;

interface gameObjectFE {
  id: string;
  home_team: string;
  away_team: string;
  home_points: number;
  away_points: number;
  commence_time: number; //in unix so smart contract conversion is easier
}
interface gameObjectSC {
  home_points: number;
  away_points: number;
  commence_time: number; //in unix so smart contract conversion is easier
}
app.get("/", async (req, res) => {
  res.send("Server for scry hackathon");
});
app.get("/list", async (req, res, next) => {
  console.log("hello world");
  const date = returnFormattedDate();
  const link = `https://api.the-odds-api.com/v4/sports/basketball_nba/odds?apiKey=${apiKey}&regions=us&markets=spreads&dateFormat=unix&oddsFormat=american&bookmakers=draftkings&commenceTimeFrom=${date}`;
  var idArr: string[] = [];
  var gameInfoArr: gameObjectFE[] = [];
  try {
    const response = await axios.get(link);
    let json = response.data;
    json.forEach((info) => {
      idArr.push(info["id"]);
    });
    console.log(idArr)
    for (var id of idArr) {
      var data = await getGameDataFE(id, date);
      gameInfoArr.push(data);
    }
    console.log(gameInfoArr)
    res.send(gameInfoArr)
  } catch (err) {
    throw err;
  }
});
app.get("/game-result/:id", (req, res, next) => {
  const specscoreslink = `https://api.the-odds-api.com/v4/sports/basketball_nba/scores/?daysFrom=1&apiKey=${apiKey}&eventIds=${req.params.id}`;
  console.log("scoresbyid" + req.params.id);
  res.send("scoresbyid" + req.params.id);
});

app.get("/game/:id", async (req, res) => {
  const date = returnFormattedDate();
  var gmInfo = await getGameDataFE(req.params.id, date);
  res.send(gmInfo);
});

app.listen(port, () => {
  console.log(`NBAAPI app listening on port ${port}`);
});

async function getGameDataFE(id: string, date: string): Promise<gameObjectFE> {
  const specOddsLink = `https://api.the-odds-api.com/v4/sports/basketball_nba/odds?apiKey=${apiKey}&regions=us&markets=spreads&dateFormat=unix&oddsFormat=american&eventIds=${id}&bookmakers=draftkings&commenceTimeFrom=${date}`;
  try {
    const response = await axios.get(specOddsLink);
    const id = response.data[0]["id"];
    const commence_time = response.data[0]["commence_time"];
    const home_team = response.data[0]["home_team"];
    const away_team = response.data[0]["away_team"];
    const home_points =
      response.data[0]["bookmakers"][0]["markets"][0]["outcomes"][0]["point"];
    const away_points =
      response.data[0]["bookmakers"][0]["markets"][0]["outcomes"][1]["point"];

    const gameInfo = {
      id,
      home_team,
      away_team,
      home_points,
      away_points,
      commence_time,
    };
    return gameInfo;
  } catch (err) {
    console.log(err);
    throw err;
  }
}

function returnFormattedDate() {
  var date = new Date().toISOString();
  var newdate = date.slice(0, date.length - 5) + "Z";
  return newdate;
}

export default app;
