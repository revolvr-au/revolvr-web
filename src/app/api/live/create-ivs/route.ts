export async function POST(req: Request) {
  try {
    const ivs = eval('require')('@aws-sdk/client-ivs');
    console.log('ivs keys:', Object.keys(ivs));
    console.log('ivs.IVSClient:', typeof ivs.IVSClient);
    console.log('ivs.default:', typeof ivs.default);
    console.log('ivs.default?.IVSClient:', typeof ivs.default?.IVSClient);

    const IVSClient = ivs.IVSClient ?? ivs.default?.IVSClient;
    const CreateChannelCommand = ivs.CreateChannelCommand ?? ivs.default?.CreateChannelCommand;

    console.log('IVSClient resolved:', typeof IVSClient);

    if (!IVSClient) {
      return Response.json({ error: 'IVSClient not found', keys: Object.keys(ivs) }, { status: 500 });
    }

    const ivsClient = new IVSClient({
      region: process.env.AWS_REGION ?? "ap-northeast-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    return Response.json({ ok: true, test: 'IVSClient instantiated' });
  } catch (err: any) {
    console.error("create-ivs error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
