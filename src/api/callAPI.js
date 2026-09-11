import toast from 'react-hot-toast';

export default async function callApi(callback, toastIt=false, ...params) {
  try {
    let r = await callback(...params);

    if (r)
      return r;
    else
      return { success: true }

  } catch (error) {
    if (!toastIt || error.status == 401)
      return;

    if (error.response?.data?.Message?.[0])
      toast.error(error.response.data.Message[0], { duration: 4000 });

    // Sem error.response (rede caída, timeout) o acesso direto lançava dentro do catch.
    else if (error.response?.data?.message) {
      console.log(error);
      
      toast.error(error.response.data.message, { duration: 4000 });
    }

    else
      toast.error(error.message, { duration: 4000 });
  }
}