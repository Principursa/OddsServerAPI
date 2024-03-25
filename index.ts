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

interface gameObject {
  id: string;
  home_team: string;
  away_team: string;
  home_points: number;
  away_points: number;
  commence_time: string; //in unix so smart contract conversion is easier
}

app.get("/list", (req, res, next) => {
  console.log("hello world");
  const link = `https://api.the-odds-api.com/v4/sports/basketball_nba/odds?regions=us&oddsFormat=american&apiKey=${apiKey}`;
  axios
    .get(link)
    .then((response) => {
      let json = stringify(response.data[0].bookmakers[0].markets);
      res.send(json);
    })
    .catch((err) => next(err));
});
app.get("/game-result/:id", (req, res, next) => {
  const specscoreslink = `https://api.the-odds-api.com/v4/sports/basketball_nba/scores/?daysFrom=1&apiKey=${apiKey}&eventIds=${req.params.id}`
  console.log("scoresbyid" + req.params.id);
  res.send("scoresbyid" + req.params.id);
});

app.get("'/game/:id", (req, res, next) => {
  const date = returnFormattedDate()
  const specOddsLink = `https://api.the-odds-api.com/v4/sports/basketball_nba/odds?apiKey=${apiKey}&regions=us&markets=spreads&dateFormat=unix&oddsFormat=american&eventIds=${req.params.id}&bookmakers=draftkings&commenceTimeFrom=${date}`;
  axios
    .get(specOddsLink)
    .then((response) => {
      let id = response.data[0]["id"]
      let commence_time = response.data[0]["commence_time"]
      let home_team = response.data[0]["home_team"]
      let away_team = response.data[0]["away_team"]
      let home_points = response.data[0]["bookmakers"][0]["markets"][0]["outcomes"][0]["point"]
      let away_points = response.data[0]["bookmakers"][0]["markets"][0]["outcomes"][1]["point"]
      let gameinit : gameObject = { id,home_team,away_team,home_points,away_points,commence_time }
      let json = stringify(response.data[0]["bookmakers"][0]["markets"][0]["outcomes"][0]["point"], null, "\t");
      console.log(`1:${home_team} \t 2: ${away_team}`)
      res.send(gameinit);
    })
    .catch((err) => next(err));
});

app.listen(port, () => {
  console.log(`NBAAPI app listening on port ${port}`);
});

function returnFormattedDate(){
  var date = new Date().toISOString();
  var newdate = date.slice(0, date.length - 5) + "Z"
  return newdate

}

module.exports = app;
