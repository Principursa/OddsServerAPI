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
import cors from "cors";

dotenv.config();
const apiKey = process.env.API_KEY;
const app = express();
const port = 3000;

const apiLog = (requestLog: string) => {
  console.log(Date.now(),requestLog)
  console.log("called")

}
interface gameObjectFE {
  id: string;
  home_team: string;
  away_team: string;
  home_points: number | string;
  away_points: number | string;
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
app.use(cors());
app.get("/", async (req, res) => {
  res.send("Server for scry hackathon");
});
const instance = axios.create({
  proxy: false  
})
app.get("/game/list", async (req, res, next) => {
  const date = returnFormattedDate();
  const fowarddate = returnFormattedDatePlusTwo()//NOTE: might want to do some function overloading with this
  const link = `https://api.the-odds-api.com/v4/sports/basketball_nba/odds?apiKey=${apiKey}&regions=us&markets=spreads&dateFormat=unix&oddsFormat=american&bookmakers=draftkings&commenceTimeFrom=${date}&commenceTimeTo=${fowarddate}`;
  console.log(link)
  try {
    const response = await axios.get(link);
    let json = response.data;
    var promiseArray: Promise<gameObjectFE>[] = [];
    json.forEach((info) => {
      console.log("info:",info)
      promiseArray.push(getGameDataFE(info));
    });
    var arr = await Promise.allSettled(promiseArray);
    const newray = arr.map((item) => {
      if (item["status"] == "fulfilled"){
        console.log(item["value"])
        return item["value"]
      }

    })
    res.send(newray);
  } catch (err) {
    throw err;
  }
});
app.get("/game-result/:id", async (req, res, next) => {
  const scoreLink = `https://api.the-odds-api.com/v4/sports/basketball_nba/scores?apiKey=${apiKey}&daysFrom=3&dateFormat=unix&eventIds=${req.params.id}`;
  try {
    const response = await axios.get(scoreLink)
    var gmInfo = await getGameResult(response.data[0])
    res.send(gmInfo)
  } catch (error) {
    throw(error)
  }
});

app.get("/game-results/list", async (req, res, next) => {
  const scoresListLink = `http://api.the-odds-api.com/v4/sports/basketball_nba/scores/?apiKey=${apiKey}&daysFrom=1&dateFormat=unix`;
  try {
    var response = await instance.get(scoresListLink);
    let json = response.data
    var promiseArray: Promise<gameResult>[] = [];
    json.forEach((info) => {
      promiseArray.push(getGameResult(info))
    })
    var arr = await Promise.allSettled(promiseArray)
    const newray = arr.map((item) => {
      if (item["status"] == "fulfilled"){
        console.log(item["value"])
        return item["value"]
      }
    })
    res.send(newray);
  } catch (err) {
    console.log(err)
  }
});

app.get("/game/:id", async (req, res) => {
  const date = returnFormattedDate();
  const specOddsLink = `https://api.the-odds-api.com/v4/sports/basketball_nba/odds?apiKey=${apiKey}&regions=us&markets=spreads&dateFormat=unix&oddsFormat=american&eventIds=${req.params.id}&bookmakers=draftkings&commenceTimeFrom=${date}`;
  try {
    const response = await axios.get(specOddsLink);
    var gmInfo = await getGameDataFE(response.data[0]);
    res.send(gmInfo);
  } catch (err) {
    throw err;
  }
});

app.get("/oracle/game/:id", async (req, res) => {
  apiLog(req.params.id)
  const date = returnFormattedDate();
  var gmInfo = await getGameDataSC(req.params.id, date);
  res.send(gmInfo);
});
app.get("/oracle/game-result/:id", async (req, res) => {
  apiLog(req.params.id)
  const result = await getGameResultSC(req.params.id, 3);
  res.send(result);
});

app.listen(port, () => {
  console.log(`NBAAPI app listening on port ${port}`);
});

async function getGameDataFE(response: any): Promise<gameObjectFE> {
  try {
    const json = response;
    const id = json["id"];
    const commence_time = json["commence_time"];
    const home_team = json["home_team"];
    const away_team = json["away_team"];

    var home_points: string | number = "TBA"
    var away_points: string | number = "TBA"
    if ( json["bookmakers"][0] !== undefined){
     home_points =
      json["bookmakers"][0]["markets"][0]["outcomes"][0]["point"];
     away_points =
      json["bookmakers"][0]["markets"][0]["outcomes"][1]["point"];
    }
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
async function getGameResult(response: any) {
  try {
    const json = response
    const id = json["id"];
    const home_team = json["home_team"];
    const away_team = json["away_team"];
    const home_score = json["scores"][0]["score"];
    const away_score = json["scores"][1]["score"];
    const commence_time = json["commence_time"];
    const completed = json["completed"];
    const gameResult: gameResult = {
      id,
      home_team,
      away_team,
      home_score,
      away_score,
      commence_time,
      completed,
    };
    return gameResult;
  } catch (err) {
    console.log(err);
    throw err;
  }
}
async function getGameResultSC(id: string, daysFrom: number) {
  const scoreLink = `https://api.the-odds-api.com/v4/sports/basketball_nba/scores?apiKey=${apiKey}&daysFrom=${daysFrom}&dateFormat=unix&eventIds=${id}`;
  try {
    const response = await axios.get(scoreLink);
    const json = response.data[0];
    const home_score = json["scores"][0]["score"];
    const away_score = json["scores"][1]["score"];
    const completed = json["completed"];
    const gameResult: gameResultSC = { home_score, away_score, completed };
    return gameResult;
  } catch (err) {
    console.log(err);
    throw err;
  }
}
function returnFormattedDatePlusTwo(){
  var date = new Date()
  var day = date.getDate()
  day = day + 2
  date.setDate(day)
  var iso = date.toISOString()

  var newdate = iso.slice(0, iso.length - 5) + "Z";
  console.log("date", newdate);
  return newdate;
}

function returnFormattedDate() {
  var date = new Date().toISOString();
  //Get two days ahead 
  var newdate = date.slice(0, date.length - 5) + "Z";
  console.log("date", newdate);
  return newdate;
}

export default app;
