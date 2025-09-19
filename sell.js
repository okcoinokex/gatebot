// sellGTDOG.js
// 运行前: npm install ethers
// 使用: node sellGTDOG.js <数量>

const { ethers } = require("ethers");

// ----------------- 直接写死私钥和 RPC -----------------
const PRIVATE_KEY = "0xbd34ad02d98c2cbc417f5618e9fabf42ed585b5af232391987eedfb305e130d0"; 
const RPC_URL = "https://evm.gatenode.cc";

// GTDOG 代币地址 & 卖出合约地址
const GTDOG_ADDRESS = "0xea54ffee02391077285a427eb60052cb0780ef7e"; 
const SELL_CONTRACT = "0xea54ffee02391077285a427eb60052cb0780ef7e";
const DECIMALS = 18; // GTDOG 精度

const ABI_ERC20 = [
  "function approve(address spender, uint256 amount) public returns(bool)",
  "function allowance(address owner, address spender) public view returns(uint256)",
  "function balanceOf(address account) public view returns(uint256)"
];

const ABI_SELL = [
  "function sellTokens(uint256 amount) public"
];

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const from = await wallet.getAddress();

  // 获取卖出数量
  const humanAmount = process.argv[2];
  if (!humanAmount) {
    console.error("请在命令行输入要卖出的数量，例如: node sellGTDOG.js 1000");
    process.exit(1);
  }

  const bigAmount = ethers.utils.parseUnits(humanAmount, DECIMALS);

  // 1. 检查余额
  const token = new ethers.Contract(GTDOG_ADDRESS, ABI_ERC20, wallet);
  const balance = await token.balanceOf(from);
  if (balance.lt(bigAmount)) {
    console.error("余额不足，无法卖出");
    process.exit(1);
  }

  // 2. 检查/执行 approve
  const allowance = await token.allowance(from, SELL_CONTRACT);
  if (allowance.lt(bigAmount)) {
    console.log("授权额度不足，正在approve...");

    // 自动获取浮动 Gas
    const baseGasPrice = await provider.getGasPrice(); // wei
    const priorityFee = ethers.utils.parseUnits("100", "gwei"); // 小费
    const maxFee = baseGasPrice.mul(30).div(10); // base * 1.5

    const approveTx = await token.approve(SELL_CONTRACT, ethers.constants.MaxUint256, {
      gasLimit: 800000,
      maxPriorityFeePerGas: priorityFee,
      maxFeePerGas: maxFee,
      type: 2 // EIP-1559
    });

    console.log("approve tx hash:", approveTx.hash);
    await approveTx.wait();
    console.log("授权完成 ✅");
  } else {
    console.log("授权额度足够 ✅");
  }

  // 3. 构造 sellTokens calldata
  const sellIface = new ethers.utils.Interface(ABI_SELL);
  const data = sellIface.encodeFunctionData("sellTokens", [bigAmount]);

  // 4. 自动获取浮动 Gas 发送卖出交易
  const baseGasPrice = await provider.getGasPrice();
  const priorityFee = ethers.utils.parseUnits("100", "gwei");
  const maxFee = baseGasPrice.mul(30).div(10);

  const tx = {
    to: SELL_CONTRACT,
    data: data,
    gasLimit: 850000,
    maxPriorityFeePerGas: priorityFee,
    maxFeePerGas: maxFee,
    type: 2 // EIP-1559
  };

  console.log(`正在卖出 ${humanAmount} GTDOG...`);
  const sentTx = await wallet.sendTransaction(tx);
  console.log("tx hash:", sentTx.hash);
  const receipt = await sentTx.wait();
  console.log("交易完成 ✅ block:", receipt.blockNumber, "status:", receipt.status);
}

main().catch(console.error);
