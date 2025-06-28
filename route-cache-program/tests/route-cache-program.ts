import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RouteCacheProgram } from "../target/types/route_cache_program";
import { assert } from "chai";

describe("route-cache-program", () => {
  // 配置 Anchor 以使用本地的 Anvil 节点和钱包
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // 从编译好的IDL中获取我们的程序实例
  const program = anchor.workspace.RouteCacheProgram as Program<RouteCacheProgram>;
  const admin = provider.wallet as anchor.Wallet;

  // 为我们的测试定义两个模拟的代币 Mint 地址（SOL 和 USDC）
  const solMint = new anchor.web3.PublicKey("So11111111111111111111111111111111111111112");
  const usdcMint = new anchor.web3.PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

  it("Is initialized and updated!", async () => {
    // 1. 计算我们将要创建或更新的RouteCache账户中的PDA地址
    // 这个计算PDA的逻辑必须与链上程序汇总的'seeds'完全匹配
    const [routeCachePda, _] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("route"),
        solMint.toBuffer(),
        usdcMint.toBuffer(),
      ],
      program.programId
    );
    
    console.log("Admin wallet address:", admin.publicKey.toBase58());
    console.log("Calculated Route Cache PDA:", routeCachePda.toBase58());

    // 2. 准备要发送的路由数据（一个包含两个步骤的模拟路由）
    const mockRoute = [
      {
        ammPoolId: anchor.web3.Keypair.generate().publicKey,
        inputMint: solMint,
        outputMint: usdcMint,
      },
      // 真实路由中，第二步的 inputMint 应该是上一步的 outputMint
      // 但为了测试，我们先保持简单
      {
        ammPoolId: anchor.web3.Keypair.generate().publicKey,
        inputMint: solMint,
        outputMint: usdcMint,
      },
    ];

    const txSignature = await program.methods
      .updateRoute(solMint, usdcMint, mockRoute)
      .accounts({
        // 传入"配料清单"中要求的所有账户
        routeCache: routeCachePda,
        admin: admin.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      }as any)
      .rpc(); // .rpc() 会发送并确认交易

    console.log("Update route transaction signature", txSignature);

    // 4. 从链上获取刚刚更新的账户数据
    const accountData = await program.account.routeCache.fetch(routeCachePda);
    console.log("Admin address on-chain:", accountData.admin.toBase58());
    console.log("Last updated timestamp:", new Date(accountData.lastUpdated.toNumber() * 1000).toLocaleString());
    console.log("Route steps on-chain:", accountData.route);

    // 5.验证写入的数据是否与发送的完全一致
    assert.ok(accountData.admin.equals(admin.publicKey), "Admin address should match");
    assert.ok(accountData.inputMint.equals(solMint), "Input mint should match");
    assert.ok(accountData.outputMint.equals(usdcMint), "Output mint should match");
    assert.equal(accountData.route.length, mockRoute.length, "Route should have 2 steps");

    // 验证第一个步骤的数据
    assert.ok(accountData.route[0].ammPoolId.equals(mockRoute[0].ammPoolId), "Step 1 AMM ID should match");
  });
});
