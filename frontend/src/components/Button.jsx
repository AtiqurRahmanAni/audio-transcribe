import React from "react";

const Button = ({ btnText, onClick, loading = false, loadingText = null }) => {
  return (
    <button
      type="button"
      className={`font-montserrat bg-[#7b2cbf] text-[#f7fff7] flex items-center text-[18px] border-none rounded-[20px] px-[50px] py-[7.5px] cursor-pointer hover:bg-[#7a2cbfd2] transition-colors duration-200 ease-in-out ${
        loading ? "pointer-events-none cursor-not-allowed bg-[#7a2cbfd2]" : ""
      }`}
      onClick={onClick}
      disabled={loading}
    >
      {!loading ? btnText : loadingText}
    </button>
  );
};

export default Button;
