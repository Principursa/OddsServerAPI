import axios, { AxiosResponse } from "axios";
import express, {
  Express,
  request,
  Request,
  response,
  Response,
} from "express";
import dotenv from "dotenv";
import { stringify } from "flatted";
import { resolveSync } from "bun";
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
interface gameResult {
  id: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  commence_time: number;
  completed: boolean;
}
interface gameResultSC {
  home_score: number;
  away_score: number;
  completed: boolean;
}
app.get("/", async (req, res) => {
  res.send("Server for scry hackathon");
});
app.get("/game/list", async (req, res, next) => {
  console.log("hello world");
  const date = returnFormattedDate();
  const link = `https://api.the-odds-api.com/v4/sports/basketball_nba/odds?apiKey=${apiKey}&regions=us&markets=spreads&dateFormat=unix&oddsFormat=american&bookmakers=draftkings&commenceTimeFrom=${date}`;
  console.log(link)
  var idArr: string[] = [];
  var gameInfoArr: gameObjectFE[] = [];
  try {
    const response = await axios.get(link);
    let json = response.data;
    res.send(json)
    json.forEach((info) => {
      idArr.push(info["id"]);
    });
    console.log(idArr);
     for (var id of idArr) {
      var data = await getGameDataFE(id, date);
      gameInfoArr.push(data);
    } 
    console.log(gameInfoArr);
    res.send(gameInfoArr);
  } catch (err) {
    throw err;
  }
});
app.get("/game-result/:id", async (req, res, next) => {
  const result = await getGameResult(req.params.id,3)
  res.send(result)
});

app.get("/game-results/list", async(req, res, next) => {
  const scoresListLink = `http://api.the-odds-api.com/v4/sports/basketball_nba/scores/?apiKey=${apiKey}&daysFrom=3&dateFormat=unix`
  console.log(scoresListLink)
  try{
    const response = await axios.get(scoresListLink)
    const json = response.data[0]
    res.send(response)
  }catch(err){
    console.log(err)
  }
});

app.get("/game/:id", async (req, res) => {
  const date = returnFormattedDate();
  var gmInfo = await getGameDataFE(req.params.id, date);
  res.send(gmInfo);
});

app.get("/oracle/game/:id", async (req, res) => {
  const date = returnFormattedDate()
  var gmInfo = await getGameDataSC(req.params.id, date);
  res.send(gmInfo)
});
app.get("/oracle/game-result/:id", async (req,res) => {
  const result = await getGameResultSC(req.params.id,3)
  res.send(result)

})

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
async function getGameDataSC(id: string, date: string): Promise<gameObjectSC> {
  const specOddsLink = `https://api.the-odds-api.com/v4/sports/basketball_nba/odds?apiKey=${apiKey}&regions=us&markets=spreads&dateFormat=unix&oddsFormat=american&eventIds=${id}&bookmakers=draftkings&commenceTimeFrom=${date}`;
  try {
    const response = await axios.get(specOddsLink);
    const commence_time = response.data[0]["commence_time"];
    const home_points =
      response.data[0]["bookmakers"][0]["markets"][0]["outcomes"][0]["point"];
    const away_points =
      response.data[0]["bookmakers"][0]["markets"][0]["outcomes"][1]["point"];

    const gameInfo: gameObjectSC = {
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
async function getGameResult(id: string, daysFrom: number) {
  const scoreLink = `https://api.the-odds-api.com/v4/sports/basketball_nba/scores?apiKey=${apiKey}&daysFrom=${daysFrom}&dateFormat=unix&eventIds=${id}`;
  try {
    const response = await axios.get(scoreLink);
    const json = response.data[0];
    const id = json["id"]
    const home_team = json["home_team"]
    const away_team = json["away_team"]
    const home_score = json["scores"][0]["score"]
    const away_score = json["scores"][1]["score"]
    const commence_time = json["commence_time"]
    const completed =  json["completed"]
    const gameResult : gameResult = {id,home_team,away_team, home_score, away_score, commence_time,completed}
    return gameResult

  } catch (err) {
    console.log(err)
    throw(err)
  }
}
async function getGameResultSC(id: string, daysFrom: number) {
  const scoreLink = `https://api.the-odds-api.com/v4/sports/basketball_nba/scores?apiKey=${apiKey}&daysFrom=${daysFrom}&dateFormat=unix&eventIds=${id}`;
  try {
    const response = await axios.get(scoreLink);
    const json = response.data[0];
    const home_score = json["scores"][0]["score"]
    const away_score = json["scores"][1]["score"]
    const completed =  json["completed"]
    const gameResult : gameResultSC = {home_score, away_score,completed}
    return gameResult

  } catch (err) {
    console.log(err)
    throw(err)
  }
}

function returnFormattedDate() {
  var date = new Date().toISOString();
  var newdate = date.slice(0, date.length - 5) + "Z";
  console.log("date", newdate);
  return newdate;
}

export default app;
