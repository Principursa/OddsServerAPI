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
  home_odds: number;
  away_odds: number;
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
app.get("/scoresbyid/:id", (req, res, next) => {
  console.log("scoresbyid" + req.params.id);
  res.send("scoresbyid" + req.params.id);
});

app.get("/oddsbyid/:id", (req, res, next) => {
  const date = new Date().toISOString();
  const specOddsLink = `https://api.the-odds-api.com/v4/sports/basketball_nba/odds?apiKey=${apiKey}&regions=us&markets=h2h&dateFormat=unix&oddsFormat=american&eventIds=${req.params.id}&bookmakers=draftkings&commenceTimeFrom=${date}`;
  console.log(specOddsLink)
  console.log("test");
  axios
    .get(specOddsLink)
    .then((response) => {
      let json = stringify(response.data);
      res.send(json);
    })
    .catch((err) => next(err));
  console.log("got odds by id");
  console.log(date);
  console.log(req.params.id);
});

app.listen(port, () => {
  console.log(`NBAAPI app listening on port ${port}`);
});

const fetchData = async () => {
  try {
    const response: AxiosResponse = await axios.get(link);
    const responseData = response.data;
    console.log(responseData[0].bookmakers[0].markets);
    return responseData[0].bookmakers[0].markets;
  } catch (err) {
    return err;
  }
};
