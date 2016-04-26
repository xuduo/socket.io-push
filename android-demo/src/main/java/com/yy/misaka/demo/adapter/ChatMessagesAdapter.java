package com.yy.misaka.demo.adapter;

import android.support.v7.widget.RecyclerView;
import android.support.v7.widget.RecyclerView.ViewHolder;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import com.yy.misaka.demo.R;
import com.yy.misaka.demo.entity.Message;

import java.util.ArrayList;
import java.util.List;


public class ChatMessagesAdapter extends RecyclerView.Adapter<ChatMessagesAdapter.MyViewHolder> {

    private List<Message> messagesList;

    public void addData(Message message) {
        messagesList.add(message);
        notifyDataSetChanged();
    }

    public ChatMessagesAdapter() {
        messagesList = new ArrayList<>();
    }

    static class MyViewHolder extends ViewHolder {

        TextView textViewNickName;
        TextView textViewMessage;
        View itemView;

        public MyViewHolder(View itemView) {
            super(itemView);
            this.itemView=itemView;
            textViewNickName = (TextView) itemView.findViewById(R.id.tv_nickname);
            textViewMessage = (TextView) itemView.findViewById(R.id.tv_message);
        }
    }

    @Override
    public MyViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_message, parent, false);
        return new MyViewHolder(view);
    }

    @Override
    public void onBindViewHolder(MyViewHolder holder, int position) {
        holder.textViewNickName.setText(messagesList.get(position).getNickName() + ":    ");
        holder.textViewNickName.setTextColor( messagesList.get(position).getColor());
        holder.textViewMessage.setText( messagesList.get(position).getMessage());
        holder.itemView.setTag(position);
    }

    @Override
    public int getItemCount() {
        return messagesList.size();
    }

}

