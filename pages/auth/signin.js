import { getProviders, signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function SignIn({ providers }) {
  const router = useRouter();
  const { error } = router.query;
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (error) {
      switch (error) {
        case "OAuthSignin":
          setErrorMessage("OAuth 登录过程中出错");
          break;
        case "OAuthCallback":
          setErrorMessage("OAuth 回调过程中出错");
          break;
        case "OAuthCreateAccount":
          setErrorMessage("创建 OAuth 账户时出错");
          break;
        case "EmailCreateAccount":
          setErrorMessage("创建邮箱账户时出错");
          break;
        case "Callback":
          setErrorMessage("回调处理过程中出错");
          break;
        case "OAuthAccountNotLinked":
          setErrorMessage("此邮箱已经使用其他方式登录");
          break;
        case "EmailSignin":
          setErrorMessage("发送邮件登录链接时出错");
          break;
        case "CredentialsSignin":
          setErrorMessage("登录凭据无效");
          break;
        case "SessionRequired":
          setErrorMessage("需要登录才能访问此页面");
          break;
        default:
          setErrorMessage(`登录过程中出错: ${error}`);
          break;
      }
    }
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold">登录</h1>
        
        {errorMessage && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-red-700">
            <p>{errorMessage}</p>
          </div>
        )}

        <div className="space-y-4">
          {Object.values(providers || {}).map((provider) => (
            <div key={provider.name} className="text-center">
              <button
                onClick={() => signIn(provider.id, { callbackUrl: "/" })}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                使用 {provider.name} 登录
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>登录后即可使用所有功能，包括文件同步和追加内容</p>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const providers = await getProviders();
  return {
    props: { providers },
  };
}
