// buyGTDOG.js
// 运行前: npm install ethers
// 使用: node buyGTDOG.js <GT数量>

const { ethers } = require("ethers");

// ----------------- 配置 -----------------
const PRIVATE_KEY = "0xe42be6276d357cfa3c944d980074fd4cdfb836c00db00b1819d8e70344707ada"; 
const RPC_URL = "https://evm.gatenode.cc";

const SELL_CONTRACT = "0xea54ffee02391077285a427eb60052cb0780ef7e"; // 买入合约地址
const CALDATA_PREFIX = "0xd0febe4c"; // 固定函数选择器
const DECIMALS = 18; // GT 精度

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const from = await wallet.getAddress();

  // 获取购买 GT 数量
  const humanAmount = process.argv[2];
  if (!humanAmount) {
    console.error("请在命令行输入要购买的 GT 数量，例如: node buyGTDOG.js 0.5");
    process.exit(1);
  }

  const amountInWei = ethers.utils.parseUnits(humanAmount, DECIMALS);

  // 发送交易
  // 交易类型 EIP-1559，Gas 自动浮动
  const baseGasPrice = await provider.getGasPrice();
  const priorityFee = ethers.utils.parseUnits("2", "gwei");
  const maxFee = baseGasPrice.mul(15).div(10);

  const tx = {
    to: SELL_CONTRACT,
    value: amountInWei,
    data: CALDATA_PREFIX,
    gasLimit: 120000,
    maxPriorityFeePerGas: priorityFee,
    maxFeePerGas: maxFee,
    type: 2 // EIP-1559
  };

  console.log(`正在购买 ${humanAmount} GT...`);
  const sentTx = await wallet.sendTransaction(tx);
  console.log("tx hash:", sentTx.hash);

  const receipt = await sentTx.wait();
  console.log("交易完成 ✅ block:", receipt.blockNumber, "status:", receipt.status);
}

main().catch(console.error);
