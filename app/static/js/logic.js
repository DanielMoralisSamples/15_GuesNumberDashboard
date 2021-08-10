Moralis.initialize(""); // Application id from moralis.io
Moralis.serverURL = ""; //Server url from moralis.io



/*Creating a contract object
This is a sample contract found in the 09_guess_number_vrf brownie project, feel free to deploy your own to have a more realistic feel of the project*/
window.web3 = new Web3(window.ethereum);
const GuessNumberAbi = [{"inputs": [{"internalType": "address", "name": "vrfCoordinator", "type": "address"}, {"internalType": "address", "name": "link", "type": "address"}, {"internalType": "bytes32", "name": "keyHash", "type": "bytes32"}, {"internalType": "uint256", "name": "fee", "type": "uint256"}], "stateMutability": "nonpayable", "type": "constructor", "name": "constructor"}, {"anonymous": false, "inputs": [{"indexed": true, "internalType": "bytes32", "name": "requestId", "type": "bytes32"}, {"indexed": true, "internalType": "uint256", "name": "roller", "type": "uint256"}], "name": "Dice_rolled", "type": "event"}, {"anonymous": false, "inputs": [{"indexed": true, "internalType": "address", "name": "owner", "type": "address"}, {"indexed": false, "internalType": "uint256", "name": "game_index", "type": "uint256"}, {"indexed": false, "internalType": "uint256", "name": "time", "type": "uint256"}], "name": "Game_created", "type": "event"}, {"anonymous": false, "inputs": [{"indexed": true, "internalType": "address", "name": "creator", "type": "address"}, {"indexed": false, "internalType": "uint256", "name": "game_index", "type": "uint256"}, {"indexed": false, "internalType": "uint256", "name": "time", "type": "uint256"}], "name": "Game_expired", "type": "event"}, {"anonymous": false, "inputs": [{"indexed": true, "internalType": "bytes32", "name": "requestId", "type": "bytes32"}, {"indexed": true, "internalType": "uint256", "name": "game_id", "type": "uint256"}], "name": "Game_served", "type": "event"}, {"anonymous": false, "inputs": [{"indexed": true, "internalType": "address", "name": "solver", "type": "address"}, {"indexed": false, "internalType": "uint256", "name": "game_index", "type": "uint256"}, {"indexed": false, "internalType": "uint256", "name": "time", "type": "uint256"}], "name": "Game_solved", "type": "event"}, {"inputs": [{"internalType": "uint256", "name": "game_id", "type": "uint256"}], "name": "cancelGame", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [], "name": "create_game", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "payable", "type": "function"}, {"inputs": [{"internalType": "uint256", "name": "game_id", "type": "uint256"}], "name": "get_game_balance", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}, {"inputs": [{"internalType": "uint256", "name": "game_id", "type": "uint256"}], "name": "get_game_guesses", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}, {"inputs": [{"internalType": "uint256", "name": "game_id", "type": "uint256"}], "name": "get_game_number_test", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}, {"inputs": [{"internalType": "uint256", "name": "game_id", "type": "uint256"}], "name": "is_game_active", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "view", "type": "function"}, {"inputs": [{"internalType": "uint256", "name": "game_id", "type": "uint256"}, {"internalType": "uint256", "name": "guessed_number", "type": "uint256"}], "name": "play_game", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "payable", "type": "function"}, {"inputs": [{"internalType": "bytes32", "name": "requestId", "type": "bytes32"}, {"internalType": "uint256", "name": "randomness", "type": "uint256"}], "name": "rawFulfillRandomness", "outputs": [], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [{"internalType": "uint256", "name": "game_id", "type": "uint256"}, {"internalType": "uint256", "name": "seed", "type": "uint256"}], "name": "rollDice", "outputs": [{"internalType": "bytes32", "name": "requestId", "type": "bytes32"}], "stateMutability": "nonpayable", "type": "function"}];
const GuessNumber = new window.web3.eth.Contract(GuessNumberAbi,'');//Guess the number game address
/* Contract Addresses
Ethereum-Rinkeby: 0x1DDFeFBe4ff5EE5261c2a77B026e7dcD7172676c
Polygon-Mumbai: 0x13e6603C07B9DD5BcB93f12A16c8d0222358546c
BSC-Testnet: 0x878bDB286b7B63eA0b3C437713c6048D29128e6B
*/


//dApp frontend logic
async function login(){
  document.getElementById('submit').setAttribute("disabled", null);
  document.getElementById('username').setAttribute("disabled", null);
  document.getElementById('useremail').setAttribute("disabled", null);
  Moralis.Web3.authenticate().then(function (user) {
      user.set("name",document.getElementById('username').value);
      user.set("email",document.getElementById('useremail').value);
      user.save();
      getGames();
  })
}

async function getGames(){
  let gameList =[];
  const Games = Moralis.Object.extend(""); //Input the moralis listener Class created through the plug in in your server
  const queryGame = new Moralis.Query(Games);
  const rawGames = await queryGame.find();
  for (let gameI = 0; gameI < rawGames.length; gameI++){
    const game = {"game_index":rawGames[gameI].get("game_index"), "owner":rawGames[gameI].get("owner"), "status":"Open", "balance":"Gone"}
    const solved = await isSolved(game)
    const expired = await isExpired(game)
    if (solved == true) {game["status"]="Solved"} 
      else{
        if (expired == true) {game["status"]="Expired"}
         else{
            game["balance"] = await getBalance(game)
          }
      }
    gameList.push(game)
  }
  buildTable(gameList)
}

async function isSolved(game){
  const statusData = Moralis.Object.extend("");//Input the moralis listener Class created through the plug in in your server
  const queryGame = new Moralis.Query(statusData);
  queryGame.equalTo("game_index",game["game_index"])
  const result = await queryGame.find();
  if (result.length > 0){
    return true
  }
  else{
    return false
  }
}

async function isExpired(game){
  const statusData = Moralis.Object.extend("");//Input the moralis listener Class created through the plug in in your server
  const queryGame = new Moralis.Query(statusData);
  queryGame.equalTo("game_index",game["game_index"])
  const result = await queryGame.find();
  if (result.length > 0){
    return true
  }
  else{
    return false
  }
}

async function getBalance(game){
  const result = await GuessNumber.methods.get_game_balance(game["game_index"]).call()
  return result/10**18
}

function buildTable(data){
  const current = ethereum.selectedAddress;
  document.getElementById("resultSpace").innerHTML =  `<table class="table table-dark table-striped" id="myTable">
                                                       </table>`;
  const table = document.getElementById('myTable');
  const rowHeader = `
                  <thead>
                      <tr>
                          <th>GameID</th>
                          <th>Owner</th>
                          <th>Status</th>
                          <th>Balance ETH</th>
                      </tr>
                  </thead>`;
  table.innerHTML += rowHeader;
  for (var i = 0; i < data.length; i++){
      var row = `<tr>
                      <td>${data[i].game_index}</td>
                      <td>${data[i].owner}</td>
                      <td>${data[i].status}</td>
                      <td>${data[i].balance}</td>
                </tr>`
      table.innerHTML += row
 } 
}