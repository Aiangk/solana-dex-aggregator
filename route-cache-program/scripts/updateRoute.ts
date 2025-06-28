import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RouteCacheProgram } from "../target/types/route_cache_program";
import fetch from "cross-fetch";

async function main() {
    console.log("🚀 Starting simplified route update script...");

    // 1. 配置 Anchor 环境
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.RouteCacheProgram as Program<RouteCacheProgram>;
    const admin = provider.wallet as anchor.Wallet;

    // 2. 定义我们要查询的代币对
    const inputMint = new anchor.web3.PublicKey("So11111111111111111111111111111111111111112"); // SOL
    const outputMint = new anchor.web3.PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"); // USDT
    const amountToQuery = 1 * (10 ** 9); // 查询 1 SOL 的路由

    // 3. 从 Jupiter API 获取路由计划 (只关心路径)
    console.log(`📡 Fetching best route plan for SOL -> USDT from Jupiter...`);
    const jupiterUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint.toBase58()}&outputMint=${outputMint.toBase58()}&amount=${amountToQuery}&onlyDirectRoutes=false`;
    
    let jupiterRoutePlan: any[];

    try {
        const response = await fetch(jupiterUrl);
        if (!response.ok) throw new Error(`Jupiter API request failed: ${response.status}`);
        const data = await response.json();
        if (!data.routePlan || data.routePlan.length === 0) throw new Error("Jupiter API did not return a valid route plan.");
        
        jupiterRoutePlan = data.routePlan;
        console.log(`✅ Found route with ${jupiterRoutePlan.length} step(s).`);
    } catch (error) {
        console.error("❌ Error fetching from Jupiter API:", error);
        return; 
    }

    // 4. 将 Jupiter 的路由计划转换为我们链上程序需要的精简格式
    const ourRouteSteps = jupiterRoutePlan.map(step => {
        const swapInfo = step.swapInfo;
        return {
            ammPoolId: new anchor.web3.PublicKey(swapInfo.ammKey),
            inputMint: new anchor.web3.PublicKey(swapInfo.inputMint),
            outputMint: new anchor.web3.PublicKey(swapInfo.outputMint),
        };
    });

    // 5. 计算 PDA 地址 (使用原始种子 "route")
    const [routeCachePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [ Buffer.from("route"), inputMint.toBuffer(), outputMint.toBuffer() ],
      program.programId
    );
    console.log(`🔐 Updating account at PDA: ${routeCachePda.toBase58()}`);

    // 6. 调用我们链上的 `update_route` 指令
    try {
        // 最终修复：确保这里传递的是三个独立的参数，而不是一个对象
        const txSignature = await program.methods
            .updateRoute(inputMint, outputMint, ourRouteSteps)
            .accounts({
                routeCache: routeCachePda,
                admin: admin.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            }as any)
            .rpc();
        
        console.log("✅ Successfully updated on-chain route cache!");
        console.log(`📝 Transaction Signature: ${txSignature}`);
    } catch (error) {
        console.error("❌ Error updating on-chain route:", error);
    }
}

main().then(
    () => console.log("Script finished successfully."),
    (error) => console.error("Script failed:", error)
);
