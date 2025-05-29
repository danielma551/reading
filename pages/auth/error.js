import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function Error() {
  const router = useRouter();
  const { error } = router.query;
  const [errorMessage, setErrorMessage] = useState("");
  const [errorDescription, setErrorDescription] = useState("");

  useEffect(() => {
    // 添加调试日志
    console.log('错误页面加载，错误代码:', error);
    console.log('完整查询参数:', router.query);
    
    if (error) {
      switch (error) {
        case "Configuration":
          setErrorMessage("服务器配置错误");
          setErrorDescription("请联系管理员检查 NextAuth.js 配置");
          break;
        case "AccessDenied":
          setErrorMessage("访问被拒绝");
          setErrorDescription("您没有权限访问此资源");
          break;
        case "Verification":
          setErrorMessage("验证链接无效或已过期");
          setErrorDescription("请尝试重新登录");
          break;
        default:
          setErrorMessage("认证过程中出错");
          setErrorDescription(`错误代码: ${error}`);
          break;
      }
    }
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold text-red-600">登录错误</h1>
        
        <div className="mb-6 rounded-md bg-red-50 p-4 text-red-700">
          <h2 className="mb-2 text-lg font-semibold">{errorMessage || "未知错误"}</h2>
          <p>{errorDescription || "登录过程中发生未知错误，请稍后再试"}</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => router.push("/auth/signin")}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            返回登录页面
          </button>
          
          <button
            onClick={() => router.push("/")}
            className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            返回首页
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>如果问题持续存在，请检查您的 Google 账户设置或联系管理员</p>
        </div>
      </div>
    </div>
  );
}
